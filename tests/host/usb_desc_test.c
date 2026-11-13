/* SPDX-License-Identifier: GPL-3.0-only */
/* The USB descriptors in usb.c as a host reads them, with the audio input on (-DT_CDC=0, as AISLING ships, or 1):
 * lengths, interface numbers, the AC header's list, bcdDevice. And that list against a reduced model of the
 * kernel's USB audio parser up to macOS 15, after Felucca's tests/usb_desc_test.c (its #67): AppleUSBAudio-273.4.1,
 * AUAConfigurationDictionary::parseConfigurationDescriptor. A model, not a Mac: only an older Mac proves it. */
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#define RING_PUBLISH() __asm__ volatile("" ::: "memory")
#define FELUCCA_UAC 1
#define FELUCCA_CDC T_CDC
#ifdef T_SPK                      /* AISLING FX: the stream from the host as well (-DT_SPK=1 -DT_CDC=0) */
#define FELUCCA_SPK T_SPK
#else
#define T_SPK 0
#endif
static void fm1_delay_ms(uint32_t ms) { (void)ms; }
#include "usb.c"

static int fails;
static void check(const char *what, int ok)
{
    printf("  %s %s\n", ok ? "ok  " : "FAIL", what);
    fails += !ok;
}

/* 1: the walk reaches the audio streaming interface. The list is walked by the header's count, a MIDI interface is
 * taken out of it during the walk, and a look-up past the end of the shortened list ends the parse. */
static int aua_parses_as(const uint8_t *c, uint32_t n)
{
    uint8_t list[8], len = 0, num = 0;
    uint32_t off, i, k;
    int have_ac = 0;
    for (off = 0; off < n && c[off] >= 2; off += c[off]) {
        const uint8_t *d = c + off;
        if (d[1] == 4 && d[5] == 1 && d[6] == 1)
            have_ac = 2;
        else if (d[1] == 0x24 && d[2] == 1 && have_ac == 2) {
            num = d[7];
            for (len = 0; len < num && len < sizeof list; len++)
                list[len] = d[8 + len];
            have_ac = 1;
        } else if (d[1] == 4 && d[5] == 1 && d[6] == 3) {
            for (i = 0; i < num; i++) {
                if (i >= len)
                    return 0;
                if (list[i] == d[2]) {
                    for (k = i; k + 1 < len; k++)
                        list[k] = list[k + 1];
                    len--;
                }
            }
        } else if (d[1] == 4 && d[5] == 1 && d[6] == 2 && have_ac == 1) {
            for (i = 0; i < num; i++) {
                if (i >= len)
                    return 0;
                if (list[i] == d[2])
                    return 1;
            }
        }
    }
    return 0;
}

int main(void)
{
    const uint8_t *dev, *cfg;
    uint16_t dl, cl;
    uint32_t off, sum = 0, ifs = 0, hdr = 0, ac_sum = 0, in_ac = 0, eps = 0, iso_out = 0;
    int order_ok = 1, last_if = -1;
    uint8_t swapped[sizeof CFG_DESC];

    check("device descriptor comes back", get_desc(1u << 8, &dev, &dl) && dl == 18);
    check("configuration descriptor comes back", get_desc(2u << 8, &cfg, &cl) && cl == sizeof CFG_DESC);
    for (off = 0; off < cl && cfg[off] >= 2; off += cfg[off]) {
        const uint8_t *d = cfg + off;
        sum += d[0];
        if (d[1] == 4 && d[3] == 0) {                    /* alt 0: a new interface */
            ifs++;
            order_ok &= (int)d[2] == last_if + 1;
            last_if = d[2];
        }
        if (d[1] == 0x24 && d[2] == 1 && !hdr && off < 40)
            hdr = off;
        if (d[1] == 4)
            in_ac = d[2] == 0;
        else if (d[1] == 0x24 && in_ac)
            ac_sum += d[0];
        if (d[1] == 5) {
            eps |= 1u << ((d[2] & 15u) + (d[2] & 0x80u ? 8u : 0u));
            if (d[2] == 0x03 && d[3] == 0x09 && (uint32_t)(d[4] | d[5] << 8) >= 180u && d[0] == 9)
                iso_out = 1;
        }
    }
    check("the AC header's own total is its descriptors' lengths", hdr && (uint32_t)(cfg[hdr + 5] | cfg[hdr + 6] << 8) == ac_sum);
    check("the lengths add up to wTotalLength", sum == cl && (uint32_t)(cfg[2] | cfg[3] << 8) == cl);
    check("bNumInterfaces, numbered in order", cfg[4] == ifs && order_ok);
#if T_SPK
    check("AC header: both audio streams (2, 3) first, then MIDI (1)",
          hdr && cfg[hdr] == 11 && cfg[hdr + 7] == 3 && cfg[hdr + 8] == UAC_AS_IF && cfg[hdr + 9] == SPK_AS_IF &&
          cfg[hdr + 10] == 1);
    check("endpoint 3 OUT: isochronous adaptive, a 45-frame packet fits", iso_out && eps == (1u << 1 | 1u << 3 | 1u << 9 | 1u << 12));
    check("bcdDevice moved, so hosts drop what they cached", dev[13] == 3 && dev[12] == 0x38);
#else
    check("AC header: audio streaming (2) first, then MIDI (1)",
          hdr && cfg[hdr + 7] == 2 && cfg[hdr + 8] == UAC_AS_IF && cfg[hdr + 9] == 1);
    check("bcdDevice moved, so hosts drop what they cached", dev[13] == 3 && dev[12] == (T_CDC ? 0x19 : 0x18));
#endif
    check("the model of macOS up to 15 reaches the audio stream", aua_parses_as(cfg, cl));
    /* the old order, through the same model: if this passes, the model proves nothing */
    memcpy(swapped, cfg, cl);
    swapped[hdr + 8] = 1;
    swapped[hdr + 9 + T_SPK] = UAC_AS_IF;
    check("control: MIDI first (AISLING up to 0.3) stops short of it", !aua_parses_as(swapped, cl));
    printf(fails ? "usb_desc: %d FAILED\n" : "usb_desc: ok\n", fails);
    return fails != 0;
}
