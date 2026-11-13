/* SPDX-License-Identifier: GPL-3.0-only */
/* AISLING FX's sound from the host (usb.c, FELUCCA_SPK) against clocks that do not agree: the host sends a 1 ms
 * packet of the 44.1 pattern by its clock, seen by a 2 kHz poll; the FM-1's I2S takes 512-frame halves (two
 * 256-frame takes back to back) at RATE_OUT. A 1 kHz sine goes in by the host's clock; after 20 s of settling it
 * must come out at 1 kHz by the host's clock (so 1000 * 44100 / rate_out by the FM-1's count of samples), clean,
 * with no take short of frames, no packet dropped, and the ring's low point near SP_MID. */
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#define RING_PUBLISH() __asm__ volatile("" ::: "memory")
#define FELUCCA_UAC 1
#define FELUCCA_SPK 1
static void fm1_delay_ms(uint32_t ms) { (void)ms; }
#include "usb.c"

static int16_t outL[44400 * 40];

static int run(double rate_out)
{
    double t_host = 0, t_dev = 0, ph = 0, err = 0, sig = 0, f, w, want;
    static int16_t blk[512];
    long nout = 0, a, i, zc = 0;
    uint32_t acc = 0, under0 = 0, over0 = 0;
    int settled = 0;
    memset(&spk, 0, sizeof spk);
    memset(&usb, 0, sizeof usb);
    sp_w = sp_r = 0;
    usb.config = 1;
    spk.alt = 1;
    spk.fresh = 1;
    spk.fill_lo = 0xFFFFFFFFu;
    while (t_dev < 40.0) {
        if (t_host <= t_dev) {                           /* the host's 1 ms frame: 44 or 45 frames into the ring */
            uint32_t n = 44, k, wr = sp_w;
            if ((acc += 100u) >= 1000u) {
                acc -= 1000u;
                n++;
            }
            if (SP_N - (wr - sp_r) < n)
                spk.overruns++;
            else {
                for (k = 0; k < n; k++, ph += 1000.0 / 44100.0) {
                    uint32_t v = (uint16_t)(int16_t)lrint(sin(2 * M_PI * ph) * 16000.0);
                    sp_ring[(wr + k) & (SP_N - 1u)] = v | v << 16;
                }
                sp_w = wr + n;
            }
            t_host += 0.001;
        } else {                                         /* a half: two takes, back to back */
            int b, k;
            if (!settled && t_dev > 10.0) {
                settled = 1;
                under0 = spk.underruns;
                over0 = spk.overruns;
            }
            for (b = 0; b < 2; b++) {
                spk_take(blk, 256);
                for (k = 0; k < 256 && nout < (long)(sizeof outL / sizeof outL[0]); k++)
                    outL[nout++] = blk[2 * k];
            }
            t_dev += 512.0 / rate_out;
        }
    }
    a = nout / 2;
    for (i = a + 1; i < nout; i++)
        zc += (outL[i - 1] < 0) != (outL[i] < 0);
    f = zc / 2.0 / ((nout - a) / rate_out);              /* by the FM-1's clock, in real time */
    want = 1000.0;
    w = 2 * M_PI * (f / rate_out);
    for (i = a + 2; i < nout; i++) {                     /* a sine's next sample from the two before */
        double pred = 2 * cos(w) * outL[i - 1] - outL[i - 2];
        err += (outL[i] - pred) * (outL[i] - pred);
        sig += (double)outL[i] * outL[i];
    }
    printf("  out %.0f Hz: %.3f Hz, residual %.1f dB, %u dry takes and %u dropped packets after 10 s, low point %u "
           "(SP_MID %d), range %u..%u\n", rate_out, f, 10 * log10(err / sig), spk.underruns - under0,
           spk.overruns - over0, spk.fill_min, SP_MID, spk.fill_lo, spk.fill_hi);
    return fabs(f - want) < 0.05 && 10 * log10(err / sig) < -60.0 && spk.underruns == under0 && spk.overruns == over0 &&
           spk.fill_min > SP_MID - 60u && spk.fill_min < SP_MID + 60u && spk.fill_lo >= 250u && spk.fill_hi < 700u   /* (a clock 0.45 % off runs dry once
                                                          * at the start, then holds: the FM-1 is 0.1 % off) */;
}

int main(void)
{
    int ok = run(44145.0) & run(44100.0) & run(44300.0) & run(43950.0);
    printf(ok ? "spk: ok\n" : "spk: FAILED\n");
    return !ok;
}
