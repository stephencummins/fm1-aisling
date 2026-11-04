// SPDX-License-Identifier: GPL-3.0-only
// (0.5) USB audio before MASTER: each piece played in a fresh process (state outlasts en_init), with the Filter knob
// closed half way so the master filter is in it, and the samples hashed.
//  - the analogue's samples are the same with the USB pair made or not;
//  - the USB pair is the same at any MASTER, and is what the analogue plays at MASTER 2048 (the golden level);
//  - at MASTER 0 the analogue is silent and the USB pair still plays.
// With --peaks, each piece's USB peak and RMS over two minutes, to set USB_GAIN by.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <unistd.h>
#include <sys/wait.h>
#include "amb.h"

void en_midi_out(uint32_t st, uint32_t d1, uint32_t d2) { (void)st; (void)d1; (void)d2; }

struct res { uint32_t ana, usb; int32_t ana_pk, usb_pk; float rms; };

static int32_t buf[512], ubuf[512];

static void play(int i, uint32_t master, int usb, int secs, struct res *r)
{
    int16_t pp[P_NPARAMS];
    uint16_t pl;
    int p, b, j;
    const int blocks = (int)((float)secs * 44100.0f / 256.0f);
    float sum = 0.0f;
    memset(r, 0, sizeof *r);
    r->ana = r->usb = 2166136261u;
    en_init();
    en_piece(i, pp, &pl);
    for (p = 0; p < P_NPARAMS; p++) en_set(p, pp[p]);
    en_pool(pl);
    en_regrow();
    en_play(1);
    en_usb_out = usb ? ubuf : 0;
    for (b = 0; b < blocks; b++) {
        if (b == blocks / 2)
            en_macro(EN_MAC_FILTER, -40);
        en_render(buf, 256, master);
        for (j = 0; j < 512; j++) {
            int32_t a = abs(buf[j]);
            r->ana = (r->ana ^ (uint32_t)buf[j]) * 16777619u;
            if (a > r->ana_pk) r->ana_pk = a;
            if (usb) {
                int32_t u = abs(ubuf[j]);
                r->usb = (r->usb ^ (uint32_t)ubuf[j]) * 16777619u;
                if (u > r->usb_pk) r->usb_pk = u;
                sum += ((float)ubuf[j] / 8388608.0f) * ((float)ubuf[j] / 8388608.0f);
            }
        }
    }
    r->rms = sum / ((float)blocks * 512.0f);
}

static void run(int i, uint32_t master, int usb, int secs, struct res *r)
{
    int fd[2];
    pid_t pid;
    if (pipe(fd) || (pid = fork()) < 0) { perror("fork"); exit(2); }
    if (!pid) {
        play(i, master, usb, secs, r);
        if (write(fd[1], r, sizeof *r) != (ssize_t)sizeof *r) _exit(2);
        _exit(0);
    }
    close(fd[1]);
    if (read(fd[0], r, sizeof *r) != (ssize_t)sizeof *r) { printf("no result from a child\n"); exit(2); }
    close(fd[0]);
    waitpid(pid, 0, 0);
}

int main(int argc, char **argv)
{
    int i, bad = 0;
    if (argc > 1 && !strcmp(argv[1], "--peaks")) {
        for (i = 0; i < EN_NPIECES; i++) {
            struct res r;
            run(i, 2048, 1, 120, &r);
            printf("%d peak %.1f dBFS  rms %.1f dBFS\n", i, (double)(20.0f * log10f((float)r.usb_pk / 8388608.0f)), (double)(10.0f * log10f(r.rms)));
        }
        return 0;
    }
    for (i = 0; i < EN_NPIECES; i++) {
        struct res off, on, low, zero;
        run(i, 2048, 0, 30, &off);
        run(i, 2048, 1, 30, &on);
        run(i, 300, 1, 30, &low);
        run(i, 0, 1, 30, &zero);
        if (on.ana != off.ana) { printf("%d: the USB pair changed the analogue\n", i); bad++; }
        if (low.usb != on.usb || zero.usb != on.usb) { printf("%d: USB follows MASTER\n", i); bad++; }
        if (on.usb != on.ana) { printf("%d: USB is not the analogue's samples at MASTER 2048\n", i); bad++; }
        if (zero.ana_pk != 0) { printf("%d: MASTER 0 is not silent (%d)\n", i, (int)zero.ana_pk); bad++; }
        if (zero.usb_pk < 100000) { printf("%d: USB silent at MASTER 0 (%d)\n", i, (int)zero.usb_pk); bad++; }
    }
    printf("usbtap: %d bad\n", bad);
    return bad != 0;
}
