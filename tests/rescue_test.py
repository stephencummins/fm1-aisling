#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""tools/fm1_rescue.py against a simulated FM-1 in the chip's update mode (no hardware, no pyusb).
The fake answers the loader's commands on a 1 MiB flash; the stock packages are stand-ins with
V15's and V16's sizes and two different heads. Run from the repo root:
  python3 tests/rescue_test.py
Also checks M-VAVE's real V15 and V16 in ~/fm1-rescue (where tools/fm1_rescue.sh keeps them;
skipped otherwise)."""
import hashlib
import struct
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import fm1_rescue as R  # noqa: E402

failed = 0


def ok(cond, what):
    global failed
    print(f"{what:<64} {'ok' if cond else 'FAIL'}")
    failed += not cond


# ---------------------------------------------------------- simulated FM-1 ---

class FakeBot:
    """The loader's side of the bulk-only transport: one command per xfer, on a flash bytearray."""

    def __init__(self, flash):
        self.flash, self.erased, self.programmed, self.ran = bytearray(flash), [], [], False

    def xfer(self, cdb, data_out=None, n_in=0, timeout=5000):
        cdb = bytes(cdb)
        if cdb[0] == 0x12:                                   # inquiry
            return b"\0" * 8 + b"WL82    " + b"UBOOT1.00".ljust(16) + b"\0" * 4
        cmd = struct.unpack_from(">H", cdb)[0]
        if cmd in (R.CMD_WRITE_MEMORY, R.CMD_WRITE_FLASH):
            addr, n = struct.unpack_from(">IH", cdb, 2)
            assert n == len(data_out) and struct.unpack_from("<H", cdb, 9)[0] == R.crc16(data_out)
            if cmd == R.CMD_WRITE_FLASH:
                assert all(b == 0xFF for b in self.flash[addr:addr + n]), "programmed without an erase"
                self.flash[addr:addr + n] = data_out
                self.programmed.append(addr)
            return b""
        if cmd == R.CMD_READ_FLASH:
            addr, n = struct.unpack_from(">IH", cdb, 2)
            return bytes(self.flash[addr:addr + n])
        reply = bytearray(16)
        struct.pack_into(">H", reply, 0, cmd)
        if cmd == R.CMD_READ_KEY:
            k = bytearray([0x0F, 0x98])                      # key 980F, ciphered as the chip sends it
            R.crc_cipher(k)
            reply[2 + 5], reply[2 + 4] = k[0], k[1]
        elif cmd == R.CMD_GET_ONLINE_DEVICE:
            reply[2] = 3
            struct.pack_into("<I", reply, 4, 0x856014)
        elif cmd == R.CMD_ERASE_SECTOR:
            addr = struct.unpack_from(">I", cdb, 2)[0]
            self.flash[addr:addr + R.SECTOR] = b"\xFF" * R.SECTOR
            self.erased.append(addr)
        elif cmd == R.CMD_RUN_APP:
            self.ran = True
        return bytes(reply[:n_in])


def image(seed, size):
    """a stand-in package image: a head and an app of their own"""
    out = bytearray()
    while len(out) < size:
        out += hashlib.sha256(f"{seed}{len(out)}".encode()).digest()
    return bytes(out[:size])


def flash_with(head_of, app_seed, tail_seed):
    """an FM-1: a stock head, some other firmware in the app area, its own data above"""
    f = bytearray(image(tail_seed, R.FLASH_SIZE))
    f[0:R.WRITE_MIN] = head_of[0:R.WRITE_MIN]
    f[R.WRITE_MIN:0x93000] = image(app_seed, 0x93000)[R.WRITE_MIN:]
    return f


def run(flash, stock, write=True, confirm=None):
    bot = FakeBot(flash)
    said = []
    with tempfile.TemporaryDirectory() as d:
        try:
            r = R.rescue(R.Uboot(bot), stock, b"loader", write, d,
                         say=lambda *a, **k: said.append(" ".join(map(str, a))), confirm=confirm)
        except R.Fail as e:
            r = e
        backups = list(Path(d).glob("fm1-backup-*.bin"))
        backup = backups[0].read_bytes() if len(backups) == 1 else None
    return r, bot, backup, "\n".join(said)


V15 = image("V15", 0x93000)
V16 = image("V16", 0xA9000)
STOCK = [("V16", V16), ("V15", V15)]


def writes():
    before = flash_with(V16, "AISLING", "data")
    r, bot, backup, said = run(before, STOCK)
    ok(r is True and bot.ran, "V16's head: written, restarted")
    ok(backup == bytes(before), "the backup is the flash as found")
    ok(bot.flash == V16 + before[0xA9000:], "flash = V16's app over the FM-1's own head and data")
    ok(min(bot.erased) >= R.WRITE_MIN and max(bot.erased) < 0xA9000, "only [0x4000, 0xA9000) erased")
    ok(bot.erased == sorted(bot.erased, reverse=True), "sectors written high to low")
    ok("head is V16's" in said and "holds V16" in said, "says which stock it found and wrote")

    before = flash_with(V15, "AISLING", "data")
    r, bot, _, said = run(before, STOCK)
    ok(r is True and bot.flash == V15 + before[0x93000:], "V15's head: V15 written, even with V16 given")
    ok(max(bot.erased) < 0x93000, "  nothing at or above 0x93000 touched")

    same = bytearray(V16 + before[0xA9000:])
    same[0x50000:0x51000] = b"\0" * R.SECTOR
    r, bot, _, _ = run(same, STOCK)
    ok(r is True and bot.erased == [0x50000], "only sectors that differ are written")


def refusals():
    before = flash_with(V16, "AISLING", "data")
    r, bot, backup, said = run(before, STOCK, write=False)
    ok(r is False and not bot.erased and backup == bytes(before), "check only: backed up, nothing written")
    r, bot, _, _ = run(before, STOCK, write=False, confirm=lambda: False)
    ok(r is False and not bot.erased, "answer other than yes: nothing written")

    r, bot, backup, _ = run(before, [("V15", V15)])
    ok(isinstance(r, R.Fail) and "not writing" in str(r) and not bot.erased,
       "V16's head, only V15 given: refused")
    ok("V15 differs in sectors 0x0000 0x1000 0x2000 0x3000" in str(r), "  names the sectors")
    ok(backup == bytes(before), "  backup still saved")

    odd = flash_with(V16, "AISLING", "data")
    odd[0x3F00] ^= 1
    r, bot, _, _ = run(odd, STOCK)
    ok(isinstance(r, R.Fail) and "matches no stock package" in str(r) and not bot.erased,
       "a head matching neither: refused")

    dev = R.Uboot(FakeBot(bytes(R.FLASH_SIZE)))
    for addr, end in ((0x3000, 0xA9000), (0x93000, 0x93000), (0xA9000, 0xA9000)):
        try:
            dev.write_sector(addr, b"\0" * R.SECTOR, end)
            ok(False, f"write_sector refuses {addr:#x} (app ends {end:#x})")
        except R.Fail:
            ok(True, f"write_sector refuses {addr:#x} (app ends {end:#x})")


def real_packages():
    pk = {n: Path.home() / "fm1-rescue" / f"FM-1-{n}.fwsc" for n in ("V15", "V16")}
    if not all(p.exists() for p in pk.values()):
        print("  skip real packages (no ~/fm1-rescue/FM-1-V15.fwsc and FM-1-V16.fwsc)")
        return
    images = {}
    for n, p in pk.items():
        raw = p.read_bytes()
        name, end = R.STOCK.get(hashlib.sha256(raw).hexdigest(), (None, None))
        images[n] = R.package_flash_image(raw)
        ok(name == n and len(images[n]) == end, f"M-VAVE's {n}: known, flash entry {end:#x}")
    ok(images["V15"][:R.WRITE_MIN] != images["V16"][:R.WRITE_MIN], "V15's and V16's heads differ")


writes()
refusals()
real_packages()
print("rescue: " + ("all ok" if not failed else f"{failed} FAILED"))
sys.exit(1 if failed else 0)
