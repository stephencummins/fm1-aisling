/* SPDX-License-Identifier: GPL-3.0-only */
/* The firmware's own checker on a file, for tests/web/packfile_test.mjs: prints pk_check's answer. */
#include <stdio.h>
#include "pack.h"
int main(int argc, char **argv)
{
    static unsigned char b[PK_MAX + 16];
    FILE *f = argc > 1 ? fopen(argv[1], "rb") : 0;
    int n = f ? (int)fread(b, 1, sizeof b, f) : 0;
    printf("%d\n", pk_check(b, n));
    return 0;
}
