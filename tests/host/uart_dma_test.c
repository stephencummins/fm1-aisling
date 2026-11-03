/* SPDX-License-Identifier: GPL-3.0-only */
/* The polled TRS UART (hal/fm1_uart.h) and the MIDI parser (midi_uart.c), both the real ones, against a
 * model of the DMA's events: only the register reads and writes are replaced. After Felucca's
 * tests/uart_dma_test.c (its #264, 1.8.1), adapted to AISLING's queue. The model keeps the last latched
 * count outside an event, which the wl82 SDK allows; it says nothing about the chip's timing.
 * -DLEGACY_CONTROL polls the way AISLING did up to 0.3: this test must then fail (run_tests.sh checks). */
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#define RING_PUBLISH() __asm__ volatile("" ::: "memory")
static void fm1_delay_ms(uint32_t ms) { (void)ms; }
static uint32_t con_read(void), count_read(void);
static void con_write(uint32_t v), sync_io(void);
#define FM1_UART1_CON_READ() con_read()
#define FM1_UART1_CON_WRITE(v) con_write(v)
#define FM1_UART1_COUNT_READ() count_read()
#define FM1_UART1_SYNC() sync_io()
#include "usb.c"
#include "midi_uart.c"

_Static_assert(sizeof(FM1_UT1_CON0) == 2, "CON0 is 16 bits (wl82 SDK WL82.h)");
_Static_assert(sizeof(FM1_UT1_CON1) == 2, "CON1 is 16 bits");
_Static_assert(sizeof(FM1_UT1_BAUD) == 2, "BAUD is 16 bits");
_Static_assert(sizeof(FM1_UT1_HRXCNT) == 2, "HRXCNT is 16 bits");
_Static_assert(sizeof(FM1_UT1_RXCNT) == 4, "RXCNT is 32 bits");
_Static_assert(sizeof(FM1_UT1_RXSADR) == 4, "RXSADR is 32 bits");
_Static_assert(sizeof(FM1_UT1_RXEADR) == 4, "RXEADR is 32 bits");
_Static_assert(sizeof(FM1_UT1_OTCNT) == 4, "OTCNT is 32 bits");

#define EV_RX 0x4000u
#define EV_OT 0x0800u

static struct {
    uint32_t producer, available, pending, latched, writes, count_reads;
    uint32_t seq[8], ns;
} hw;
static int fails;

static void check(const char *what, int ok)
{
    printf("  %s %s\n", ok ? "ok  " : "FAIL", what);
    fails += !ok;
}
static uint32_t con_read(void) { return 0x41u | hw.pending; }
static void con_write(uint32_t v)
{
    hw.writes++;
    if (v & 0x80u) {
        if (hw.pending)
            hw.latched = hw.available;
        if (hw.ns < 8)
            hw.seq[hw.ns++] = 1;
    }
    if (v & 0x1400u) {
        hw.pending = 0;
        hw.available = 0;
        if (hw.ns < 8)
            hw.seq[hw.ns++] = 3;
    }
}
static void sync_io(void)
{
    if (hw.ns < 8)
        hw.seq[hw.ns++] = 2;
}
static uint32_t count_read(void)
{
    hw.count_reads++;
    if (hw.ns < 8)
        hw.seq[hw.ns++] = 4;
    return hw.latched;
}
static void reset(void)
{
    memset(&hw, 0, sizeof hw);
    memset(&um, 0, sizeof um);
    memset((void *)um_ring, 0, sizeof um_ring);
    mi_w = mi_r = 0;
}
static void arrive(const uint8_t *b, uint32_t n, uint32_t ev)
{
    uint32_t i;
    for (i = 0; i < n; i++)
        um_ring[hw.producer++ % UM_RING] = b[i];
    hw.available += n;
    hw.pending |= ev;
}
static void poll(void)
{
#ifdef LEGACY_CONTROL
    con_write(con_read() | 0x80u);                       /* latch, clear and count, event or no event */
    sync_io();
    con_write(con_read() | 0x1400u);
    uart_midi_take(count_read() & 0xFFFFu);
#else
    uart_midi_poll();
#endif
}
#define PK(s, a, b) ((uint32_t)((s) >> 4) | (uint32_t)(s) << 8 | (uint32_t)(a) << 16 | (uint32_t)(b) << 24)

int main(void)
{
    static const uint8_t pair[] = {0x90, 48, 80, 0x80, 48, 0};
    static const uint8_t cc[] = {0xB0, 6, 54};
    uint32_t i, step;

    reset();
    hw.latched = 37;
    poll();
    check("nothing pending: an old count moves nothing and plays nothing",
          um.rd == 0 && um.bytes == 0 && mi_w == 0 && hw.writes == 0 && hw.count_reads == 0);

    reset();
    arrive(pair, sizeof pair, EV_OT);
    poll();
    check("timed out: a note on and its note off, exactly",
          um.bytes == 6 && um.rd == hw.producer && mi_w == 2 &&
          midi_in_q[0] == PK(0x90, 48, 80) && midi_in_q[1] == PK(0x80, 48, 0));
    check("latch, barrier, clear together, then the count (as the SDK)",
          hw.ns == 4 && hw.seq[0] == 1 && hw.seq[1] == 2 && hw.seq[2] == 3 && hw.seq[3] == 4);

    /* fill what's left of the ring with plausible MIDI: none of it may play */
    for (i = 6; i < UM_RING; i += 3) {
        um_ring[i] = 0xB0;
        if (i + 1 < UM_RING)
            um_ring[i + 1] = 72;
        if (i + 2 < UM_RING)
            um_ring[i + 2] = 99;
    }
    for (i = 0; i < 1000; i++)
        poll();
    check("1000 quiet polls replay nothing from the ring",
          um.bytes == 6 && um.rd == 6 && mi_w == 2 && hw.writes == 2 && hw.count_reads == 1);

    reset();
    arrive(cc, 3, EV_RX);
    poll();
    check("RX pending takes one batch", um.bytes == 3 && mi_w == 1 && midi_in_q[0] == PK(0xB0, 6, 54));

    reset();
    arrive(pair, 6, EV_RX | EV_OT);
    poll();
    poll();
    check("both flags together: the batch once", um.bytes == 6 && mi_w == 2 && um.rd == 6);

    reset();
    arrive(pair, 2, 0);
    poll();
    check("DMA'd with no event yet: left alone", um.bytes == 0 && mi_w == 0 && hw.available == 2);
    arrive(pair + 2, 4, EV_OT);
    poll();
    check("the next event brings it all, in order", um.bytes == 6 && mi_w == 2 && um.rd == 6);

    {   /* many batch boundaries, both events, wraps, quiet polls between */
        uint32_t ok = 1, total = 0;
        reset();
        for (step = 0; ok && step < 40000u; step++) {
            uint8_t v = (uint8_t)(48 + step % 49);
            const uint8_t wire[] = {0x90, 48, 80, 0xB0, 99, 1, 0xB0, 98, 4, 0xB0, 6, v, 0xB0, 99, 127, 0xB0, 98, 127, 0x80, 48, 0};
            const uint32_t pk[] = {PK(0x90, 48, 80), PK(0xB0, 99, 1), PK(0xB0, 98, 4), PK(0xB0, 6, v),
                                   PK(0xB0, 99, 127), PK(0xB0, 98, 127), PK(0x80, 48, 0)};
            uint32_t pos = 0;
            mi_w = mi_r = 0;
            while (pos < sizeof wire) {
                uint32_t len = 1 + (step + pos) % 11;
                if (len > sizeof wire - pos)
                    len = sizeof wire - pos;
                arrive(wire + pos, len, (step + pos) % 2 ? EV_OT : EV_RX);
                poll();
                poll();
                pos += len;
            }
            total += sizeof wire;
            ok &= mi_w == 7 && um.bytes == total && um.rd == hw.producer % UM_RING && !um.drops;
            for (i = 0; ok && i < 7; i++)
                ok &= midi_in_q[i] == pk[i];
        }
        check("40000 streams, 840000 bytes in odd batches: every packet exact", ok && um.bytes == 840000u);
    }
    {   /* a full wire, no idle and so no timeouts, the poll held off now and then: with an event every
         * 32 bytes the 128-byte ring must never lap */
        uint64_t ref = UINT64_C(1469598103934665603), got = ref;
        uint32_t n = 0, most = 0;
        reset();
        for (step = 0; step < 10000u; step++) {
            uint8_t v = (uint8_t)(48 + step % 49);
            const uint8_t wire[] = {0x90, 48, 80, 0xB0, 99, 1, 0xB0, 98, 4, 0xB0, 6, v, 0xB0, 99, 127, 0xB0, 98, 127, 0x80, 48, 0};
            const uint32_t pk[] = {PK(0x90, 48, 80), PK(0xB0, 99, 1), PK(0xB0, 98, 4), PK(0xB0, 6, v),
                                   PK(0xB0, 99, 127), PK(0xB0, 98, 127), PK(0x80, 48, 0)};
            for (i = 0; i < 7; i++)
                ref = (ref ^ pk[i]) * UINT64_C(1099511628211);
            for (i = 0; i < sizeof wire; i++) {
                arrive(wire + i, 1, 0);
                if (hw.available >= FM1_UART1_RX_FRAME)
                    hw.pending |= EV_RX;
                if (hw.available > most)
                    most = hw.available;
                if (hw.producer % 1024u < 16u || hw.producer % 2u)
                    continue;
                poll();
                while (mi_r != mi_w) {
                    got = (got ^ midi_in_q[mi_r++ % MQ]) * UINT64_C(1099511628211);
                    n++;
                }
            }
        }
        hw.pending |= EV_OT;
        poll();
        while (mi_r != mi_w) {
            got = (got ^ midi_in_q[mi_r++ % MQ]) * UINT64_C(1099511628211);
            n++;
        }
        check("a full wire with the poll held off: 70000 packets exact, nothing lost",
              n == 70000u && got == ref && um.bytes == 210000u && !um.drops &&
              um.rd == hw.producer % UM_RING && most < UM_RING);
    }
    {   /* byte by byte: the parser's running status, real time in a message, a one-byte message */
        static const uint8_t b[] = {0x90, 60, 100, 62, 101, 0xF8, 64, 0xFE, 102, 0xC1, 5, 6, 0x80, 60, 0};
        static const uint32_t p[] = {PK(0x90, 60, 100), PK(0x90, 62, 101), 0xFu | 0xF8u << 8, PK(0x90, 64, 102),
                                     PK(0xC1, 5, 0), PK(0xC1, 6, 0), PK(0x80, 60, 0)};
        reset();
        for (i = 0; i < sizeof b; i++) {
            arrive(b + i, 1, EV_OT);
            poll();
            poll();
        }
        check("one byte a batch: running status, a clock inside, program change",
              mi_w == 7 && !memcmp(midi_in_q, p, sizeof p) && um.bytes == sizeof b);
    }
    printf(fails ? "uart: %d FAILED\n" : "uart: ok\n", fails);
    return fails != 0;
}
