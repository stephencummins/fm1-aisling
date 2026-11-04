/* SPDX-License-Identifier: GPL-3.0-only */
/* MASTER's curve (firmware/src/app/master.h), and that a quiet build's is silent whatever the knob says */
#include <stdio.h>
#include "master.h"
int main(void)
{
    uint32_t k;
    int bad = 0;
#ifdef AISLING_QUIET_TEST
    bad += MASTER_START != 0u;
    for (k = 0; k < 1024u; k++)
        bad += master_curve(k) != 0u;
#else
    uint32_t last = 0;
    bad += master_curve(0) != 0u;
    bad += master_curve(286) != 89u;             /* 28% of the knob: where the old curve's 15% was (91) */
    bad += master_curve(1023) != 4084u;          /* full: where it was (4088) */
    for (k = 0; k < 1024u; k++) {                /* never backwards, and no overflow on the way */
        bad += master_curve(k) < last;
        last = master_curve(k);
    }
#endif
    printf("master: %d bad\n", bad);
    return bad != 0;
}
