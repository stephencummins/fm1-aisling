/* SPDX-License-Identifier: GPL-3.0-only */
/* MASTER's knob (10 bits) to the engine's gain (Q12).
 * (0.5) A cube, so the quiet end has room: the old square's 15% of the knob (91/4096, about -33 dB) now sits at 28%,
 * and full is where it was (4084, against 4088).
 * A test build (--release X.Y-quiet) makes no sound whatever the knob says: the engine still runs, so its CPU figures
 * are real. */
#ifndef AISLING_MASTER_H
#define AISLING_MASTER_H
#include <stdint.h>
#ifdef AISLING_QUIET_TEST
#define MASTER_START 0u
static inline uint32_t master_curve(uint32_t k10) { (void)k10; return 0u; }
#else
#define MASTER_START 2048u
static inline uint32_t master_curve(uint32_t k10) { return (k10 * k10 * k10) >> 18; }
#endif
#endif
