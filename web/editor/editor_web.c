/* SPDX-License-Identifier: GPL-3.0-only */
/* AISLING's editor (a design draft): the emulator's whole firmware, with a way in for a page. Everything the page
 * knows about a piece, its pages, its knobs, their names, their help and their ranges, comes out of the firmware's own
 * tables here, so the page can't drift from the FM-1. Everything the page changes goes through the same function a
 * knob or a key calls on the device. No firmware source changes for this: only additions, on this side of the include.
 *
 *   web/editor/build.sh  ->  build/editor/{index.html, engine.js, worklet.js, amb.wasm} */
#include "../emu/amb_web.c"

#define ED __attribute__((used, visibility("default")))

/* ------------------------------------------------------------- the tables --- */
ED int ed_nviews(void) { return NVIEWS; }
ED int ed_npieces(void) { return NPIECES; }
ED int ed_nparams(void) { return P_NPARAMS; }
ED int ed_nlayers(void) { return NLAYER; }
ED int ed_format(void) { return PROJ_FORMAT; }
ED const char *ed_view_name(int v) { return VIEW_NAME[v]; }
ED int ed_view_knob(int v, int i) { return VIEW_KNOB[v][i]; }
ED const char *ed_knob_label(int v, int i) { return KNOB_LABEL[v][i]; }
ED const char *ed_knob_help(int v, int i) { return KNOB_HELP[v][i]; }
ED int ed_layer_level(int i) { return LAYER_LEVEL[i]; }
ED int ed_layer_voice(int i)
{
    static const int V[NLAYER] = {P_CVOICE, P_SVOICE, P_LVOICE, P_S2VOICE, P_NCHAR};
    return V[i];
}
ED int ed_k_none(void) { return K_NONE; }
ED int ed_k_cpu(void) { return K_CPU; }
ED int ed_k_save(void) { return K_SAVE; }
ED int ed_k_mode(void) { return K_MODE; }
ED int ed_k_leds(void) { return K_LEDS; }
ED int ed_k_play(void) { return K_PLAY; }
ED int ed_p_tempo(void) { return P_TEMPO; }
ED int ed_p_root(void) { return P_ROOT; }
ED int ed_p_mode(void) { return P_MODE; }
ED int ed_k_slot(void) { return K_SLOT; }
ED int ed_k_lane(void) { return K_LANE; }
ED int ed_is_global(int p) { return global_par(p); }
ED const char *ed_version(void) { return EN_VERSION; }
/* the screen's colours, by their own names, so the Look page starts from the firmware's and can't drift from them.
 * 0-5 the page, 6-10 the layers, 11-14 the layers' dark tints, 15- the rest (unchanged by a Look) */
ED int ed_ncolours(void) { return 23; }
ED int ed_colour(int i)
{
    static const uint16_t C[23] = {K_BG, K_PANEL, K_LINE, K_DIM, K_TEXT, K_ACC,
                                   K_PAD, K_BELL, K_BASS, K_PULSE, K_NOISE,
                                   K_PAD_T, K_BELL_T, K_BASS_T, K_PULSE_T,
                                   K_FROST, K_FROST_T, K_RIM, K_RIM_T, K_CLAP, K_CLAP_T, K_EIRE, K_EIRE_O};
    return C[i];
}
/* what the keys do, for their labels */
ED int ed_nblack(void) { return NBLACK; }
ED int ed_black_key(int b) { return BLACK_KEY[b]; }
ED const char *ed_black_name(int b) { return BLACK_NAME[b]; }
ED int ed_perf_key(int i) { return PERF_KEY[i]; }
ED int ed_perf_n(void) { return PERF_N; }
ED int ed_perf_shift(void) { return PERF_SHIFT; }
ED int ed_perf_forget(void) { return PERF_FORGET; }

/* ------------------------------------------------------------- the knobs --- */
static char text_buf[32];
ED int ed_get(int k) { return knob_get(k); }
ED int ed_lo(int k)
{
    int lo, hi;
    knob_range(k, &lo, &hi);
    return lo;
}
ED int ed_hi(int k)
{
    int lo, hi;
    knob_range(k, &lo, &hi);
    return hi;
}
ED void ed_set(int k, int v) { knob_set(k, v); }
ED const char *ed_text(int k)
{
    knob_text(k, text_buf);
    return text_buf;
}
/* what a value of k reads as, without setting it: a voice's name for its menu, a value as it's dragged */
ED const char *ed_value_text(int k, int v)
{
    text_buf[0] = 0;
    if (k < P_NPARAMS)
        en_param_text(k, v, text_buf);
    else if (k == K_MODE)
        return EN_MODE_NAME[MODE_ORDER[v < 0 ? 0 : v >= EN_NMODES ? EN_NMODES - 1 : v]];
    else if (k == K_PLAY)
        return v ? "Loop" : "Endless";
    else if (k == K_LEDS)
        return v == 2 ? "Keys" : v ? "On" : "Off";
    else if (k == K_LANE)
        return LANE_NAME[(unsigned)v < EN_NDRUM ? v : 0];
    else if (k == K_SLOT)
        snprintf(text_buf, sizeof text_buf, "%d", v + 1);
    return text_buf;
}

/* ---------------------------------------------------- where the FM-1 is looking --- */
ED int ed_view_now(void) { return ui.view; }
ED void ed_view_go(int v)                        /* a page: as its button would, PERFORM entered or left as needed */
{
    if (v < 0 || v >= NVIEWS)
        return;
    if (v == V_PERF || v == V_MIX) {
        if (!ui.perf)
            perf_set(1);
    } else if (ui.perf) {
        perf_set(0);
    }
    if (v == V_CHORDS && ui.view != V_CHORDS)
        ui.chords_from = (uint8_t)ui.view;
    if (ui.view != v)
        set_view(v);
}
ED void ed_touch(int i)                          /* the page's knob i lit on the screen, as if just turned */
{
    ui.touched = (int8_t)i;
    ui.touch_until = plat_ms() + 1200u;
}

/* ---------------------------------------------------------- playing --- */
ED int ed_playing(void) { return en_playing; }
ED int ed_frozen(void) { return en_frozen; }
ED int ed_dirty(void) { return ui.dirty; }
ED int ed_piece_now(void) { return proj.piece; }
ED void ed_play_toggle(void) { button(B_PLAY); }
ED void ed_hold_toggle(void)
{
    ui.down_t[B_REC] = plat_ms();                /* (a tap: dub hold, not the grid) */
    button(B_REC);
}
ED void ed_rest(void)                            /* (the page opened by touching a knob: silence until Play) */
{
    en_play(0);                                  /* (always: ui_init's en_play(1) is queued, en_playing still 0) */
    sp_tp.playing = 0;
    sp_tp.play_t = plat_ms();
}
ED void ed_piece_go(int i) { set_piece(i); }
ED void ed_save(void) { do_save(); }
ED void ed_voice(int p, int v)
{
    if (p == P_NCHAR) {
        knob_set(P_NCHAR, v);
        say("NOISE", EN_NCHAR_NAME[v]);
    } else {
        set_voice(p, v);
    }
}

/* PERFORM's keys, by the firmware's own function: 0-4 a layer's mute, 5-9 a move (held), 10-14 a layer's solo */
ED void ed_perf(int i, int down)
{
    if (i >= 0 && i < PERF_N)
        perf_key(PERF_KEY[i], down);
}
ED void ed_forget(void) { perf_key(PERF_FORGET, 1); }
ED const char *ed_perf_name(int i) { return PERF_NAME[i]; }
ED int ed_layer_muted(int i) { return (ui.mutes & LAYER_MUTE[i]) == LAYER_MUTE[i]; }
ED int ed_layer_solo(int i) { return (ui.solo & LAYER_MUTE[i]) != 0; }
ED int ed_layer_sounds(int i) { return perf_sounds(i); }
ED int ed_moves(void) { return ui.moves; }
ED float ed_act(int i) { return en_layer_act[i]; }

/* ---------------------------------------------------------- the pieces --- */
ED const char *ed_piece_name(int i) { return piece_name(i); }
static slot_t recipes[NPIECES];
static uint8_t recipes_ok;
static void recipes_take(void)
{
    int i;
    if (!recipes_ok)
        for (i = 0; i < NPIECES; i++)
            recipe(i, &recipes[i]);
    recipes_ok = 1;
}
ED int ed_recipe(int i, int p)                   /* a parameter in a piece's recipe: what double-click goes back to */
{
    recipes_take();
    return recipes[i].par[p];
}
ED int ed_slot_par(int i, int p) { return i == proj.piece ? proj.par[p] : proj.slot[i].par[p]; }
ED int ed_edited(int i)                          /* changed from its recipe? (Tune and MIDI out are the FM-1's) */
{
    int p;
    recipes_take();
    if ((i == proj.piece ? proj.pool : proj.slot[i].pool) != recipes[i].pool)
        return 1;
    for (p = 0; p < P_NPARAMS; p++)
        if (!global_par(p) && ed_slot_par(i, p) != recipes[i].par[p])
            return 1;
    return 0;
}

/* -------------------------------------------------- the project, as bytes --- */
/* Undo, backups and sharing: the bytes of project_t and slot_t, the same bytes the FM-1 keeps. A snapshot's copied out
 * of ed_proj; ed_commit takes one back from ed_incoming, checked as project_load checks the flash */
static project_t incoming, was;
static slot_t slot_in;
ED uint8_t *ed_proj(void) { return (uint8_t *)&proj; }
ED int ed_proj_size(void) { return (int)sizeof proj; }
ED uint8_t *ed_incoming(void) { return (uint8_t *)&incoming; }
ED int ed_slot_size(void) { return (int)sizeof(slot_t); }
ED uint8_t *ed_slot_ptr(int i) { return (uint8_t *)&proj.slot[i]; }
ED uint8_t *ed_slot_in(void) { return (uint8_t *)&slot_in; }
ED int ed_in_par(int p) { return slot_in.par[p]; }   /* (what's in a file, read without installing it) */
ED void ed_keep(void) { keep(); }                /* the piece playing, into its slot, before reading the slots */

static void reload(void)                         /* the piece playing's slot changed under it */
{
    take(&proj.slot[proj.piece]);
    project_apply();
    oct_home_take();
    mac_home();
    en_regrow();
}

ED int ed_commit(void)
{
    int p, i, oct = 0;
    was = proj;
    proj = incoming;
    pars_clamp(proj.par);
    for (i = 0; i < NPIECES; i++)
        pars_clamp(proj.slot[i].par);
    if (!project_valid()) {
        proj = was;
        return -1;
    }
    if (proj.piece != was.piece) {               /* another piece: the same as turning PRESET to it */
        mac_home();
        project_apply();
        oct_home_take();
        en_seed(plat_ms());
        en_regrow();
        sp_piece();
    } else {                                     /* the same piece: only what differs, so the patterns aren't regrown
                                                  * by undoing a level */
        for (p = 0; p < P_NPARAMS; p++)
            if (proj.par[p] != was.par[p]) {
                en_set(p, proj.par[p]);
                oct |= p == P_SEQOCT || p == P_LOCT || p == P_SEQ2OCT;
            }
        if (proj.pool != was.pool)
            en_pool(proj.pool);
        if (oct)
            oct_home_take();
    }
    mark_dirty();
    return 0;
}

ED int ed_slot_install(int i)                    /* slot_in, from a file or a share line, into piece i */
{
    if (i < 0 || i >= NPIECES)
        return -1;
    pars_clamp(slot_in.par);
    if (!pool_ok(slot_in.pool))
        return -1;
    keep();
    slot_in.pings_ok = slot_in.pings_ok ? 1 : 0;
    slot_in.screen = (uint8_t)(slot_in.screen % 3u);
    proj.slot[i] = slot_in;
    if (i == proj.piece)
        reload();
    mark_dirty();
    return 0;
}
ED void ed_slot_copy(int from, int to)
{
    if (from == to)
        return;
    keep();
    proj.slot[to] = proj.slot[from];
    if (to == proj.piece)
        reload();
    mark_dirty();
}
ED void ed_slot_swap(int a, int b)
{
    slot_t t;
    if (a == b)
        return;
    keep();
    t = proj.slot[a];
    proj.slot[a] = proj.slot[b];
    proj.slot[b] = t;
    if (a == proj.piece || b == proj.piece)
        reload();
    mark_dirty();
}
ED void ed_slot_reset(int i)                     /* a piece back to its recipe */
{
    if (i == proj.piece) {
        project_piece_reset();
        project_apply();
        oct_home_take();
        mac_home();
        en_regrow();
        say("RESET", piece_name(i));
    } else {
        recipe(i, &proj.slot[i]);
    }
    mark_dirty();
}
