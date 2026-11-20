// SPDX-License-Identifier: GPL-3.0-only
#include "PluginEditor.h"
#include "BinaryData.h"

namespace
{
// site.css's :root
const juce::Colour GROUND (0xfff3ead7), STRIP (0xffece2cb), INK (0xff2b2219), MUTED (0xff5b4a3a), RULE (0xffd9ccb1),
                   GREEN (0xff146c41), RUST (0xff8c3510);
const int BAR = 44, BENCH = 716, HEAD = 46;

// wall.js: the name's bits are the first row of 16 cells, an elementary automaton it chooses grows them 16 rows down,
// each column in a layer's colours and one live cell, the spark, in the FM-1's orange
juce::Image growWall (const char* name)
{
    static const int RULES[] = { 30, 45, 73, 86, 89, 105, 110, 124, 135, 137, 149, 150, 193 };
    static const juce::uint32 STOPS[4][4] = { { 0x1d2230, 0x3e2a22, 0x6a2a3c, 0x9a4a63 }, { 0x2e3b20, 0x536a2a, 0x7f8a35, 0xb0ab55 },
                                              { 0x7a3a1c, 0xb8622a, 0xd99b5a, 0xe8cfa0 }, { 0x262a4a, 0x4a4272, 0x7a7898, 0xa7a6b0 } };
    auto fnv = [] (const juce::String& s) {
        juce::uint32 h = 0x811c9dc5u;
        for (auto c : s.toStdString())
            h = (h ^ (juce::uint32) (unsigned char) c) * 0x01000193u;
        return h;
    };
    bool rows[16][16];
    int lit = 0;
    auto grow = [&] (juce::uint32 seed) {
        const int rule = RULES[(seed >> 16) % 13];
        lit = 0;
        for (int x = 0; x < 16; ++x)
            rows[0][x] = (seed >> x & 1u) != 0;
        for (int y = 1; y < 16; ++y)
            for (int x = 0; x < 16; ++x)
                rows[y][x] = (rule >> ((rows[y - 1][(x + 15) % 16] << 2) | (rows[y - 1][x] << 1) | (int) rows[y - 1][(x + 1) % 16]) & 1) != 0;
        for (auto& r : rows)
            for (bool b : r)
                lit += b;
    };
    juce::uint32 seed = fnv (name);
    grow (seed);
    for (int i = 0; i < 32 && (lit < 70 || lit > 170); ++i)   // (some die out or fill up: the next that leaves a picture)
        grow (seed = fnv (juce::String::toHexString ((juce::int64) seed)));
    const int n = 14, spark = lit ? (int) (seed % (juce::uint32) lit) : -1;
    juce::Image img (juce::Image::ARGB, 16 * n, 16 * n, true);
    juce::Graphics g (img);
    int k = 0;
    for (int y = 0; y < 16; ++y)
        for (int x = 0; x < 16; ++x)
            if (rows[y][x])
            {
                g.setColour (k++ == spark ? juce::Colour (0xffcb6b45) : juce::Colour (0xff000000u | STOPS[x >> 2][x & 3]));
                g.fillRect (x * n, y * n, n, n);
            }
    return img;
}
}

AislingLook::AislingLook()
{
    monoFace = juce::Typeface::createSystemTypefaceFor (BinaryData::IBMPlexMonoRegular_ttf, BinaryData::IBMPlexMonoRegular_ttfSize);
    displayFace = juce::Typeface::createSystemTypefaceFor (BinaryData::BarlowSemiCondensedSemiBold_ttf, BinaryData::BarlowSemiCondensedSemiBold_ttfSize);
    using namespace juce;
    setColour (ResizableWindow::backgroundColourId, GROUND);
    setColour (TextButton::textColourOffId, INK);
    setColour (TextButton::textColourOnId, INK);
    setColour (ToggleButton::textColourId, INK);
    setColour (Label::textColourId, INK);
    setColour (ComboBox::textColourId, INK);
    setColour (ComboBox::backgroundColourId, GROUND);
    setColour (ComboBox::outlineColourId, RULE);
    setColour (ComboBox::arrowColourId, MUTED);
    setColour (PopupMenu::backgroundColourId, GROUND);
    setColour (PopupMenu::textColourId, INK);
    setColour (PopupMenu::highlightedBackgroundColourId, GREEN);
    setColour (PopupMenu::highlightedTextColourId, GROUND);
    setColour (Slider::textBoxTextColourId, INK);
    setColour (Slider::textBoxBackgroundColourId, GROUND);
    setColour (Slider::textBoxOutlineColourId, RULE);
    setColour (Slider::textBoxHighlightColourId, STRIP);
    setColour (TextEditor::textColourId, INK);
    setColour (TextEditor::backgroundColourId, GROUND);
    setColour (TextEditor::highlightColourId, RULE);
    setColour (TextEditor::highlightedTextColourId, INK);
    setColour (TextEditor::outlineColourId, RULE);
    setColour (TextEditor::focusedOutlineColourId, INK);
    setColour (CaretComponent::caretColourId, INK);
    setColour (TabbedComponent::backgroundColourId, Colours::transparentBlack);
    setColour (TabbedComponent::outlineColourId, RULE);
    setColour (TabbedButtonBar::tabOutlineColourId, Colours::transparentBlack);
    setColour (TabbedButtonBar::frontOutlineColourId, Colours::transparentBlack);
}

juce::Font AislingLook::mono (float h) const { return juce::Font (juce::FontOptions (monoFace).withHeight (h)); }
juce::Font AislingLook::display (float h, float track) const { return juce::Font (juce::FontOptions (displayFace).withHeight (h)).withExtraKerningFactor (track); }

void AislingLook::drawButtonBackground (juce::Graphics& g, juce::Button& b, const juce::Colour&, bool over, bool down)
{
    const auto r = b.getLocalBounds();
    const bool go = (bool) b.getProperties().getWithDefault ("go", false);
    g.setColour (go ? (over || down ? juce::Colour (0xff0f5332) : GREEN) : down ? STRIP : GROUND);
    g.fillRect (r);
    g.setColour (go ? juce::Colours::transparentBlack : over ? INK : RULE);
    g.drawRect (r, 1);
}

void AislingLook::drawToggleButton (juce::Graphics& g, juce::ToggleButton& b, bool over, bool)
{
    const auto r = b.getLocalBounds();
    const juce::Rectangle<int> box (r.getX() + 1, r.getCentreY() - 7, 14, 14);
    g.setColour (b.getToggleState() ? RUST : GROUND);   // (rust for what is on)
    g.fillRect (box);
    g.setColour (b.getToggleState() ? RUST : over ? INK : MUTED);
    g.drawRect (box, 1);
    if (b.getToggleState())
    {
        g.setColour (GROUND);
        g.fillRect (box.reduced (4));
    }
    g.setColour (INK.withAlpha (b.isEnabled() ? 1.0f : 0.45f));
    g.setFont (mono (12.5f));
    g.drawText (b.getButtonText(), r.withTrimmedLeft (24), juce::Justification::centredLeft, true);
}

void AislingLook::drawComboBox (juce::Graphics& g, int w, int h, bool, int, int, int, int, juce::ComboBox& c)
{
    g.setColour (GROUND);
    g.fillRect (0, 0, w, h);
    g.setColour (c.isMouseOver (true) || c.isPopupActive() ? INK : RULE);
    g.drawRect (0, 0, w, h, 1);
    juce::Path p;
    const float x = (float) w - 14.0f, y = (float) h * 0.5f - 2.0f;
    p.addTriangle (x - 4.0f, y, x + 4.0f, y, x, y + 5.0f);
    g.setColour (MUTED.withAlpha (c.isEnabled() ? 0.8f : 0.3f));
    g.fillPath (p);
}

void AislingLook::positionComboBoxText (juce::ComboBox& c, juce::Label& l)
{
    l.setBounds (8, 1, c.getWidth() - 30, c.getHeight() - 2);
    l.setFont (getComboBoxFont (c));
}

void AislingLook::drawPopupMenuBackground (juce::Graphics& g, int w, int h)
{
    g.fillAll (GROUND);
    g.setColour (RULE);
    g.drawRect (0, 0, w, h, 1);
}

void AislingLook::drawLinearSlider (juce::Graphics& g, int x, int y, int w, int h, float pos, float, float, juce::Slider::SliderStyle, juce::Slider& s)
{
    const float cy = (float) y + (float) h * 0.5f, a = s.isEnabled() ? 1.0f : 0.4f;
    g.setColour (RULE.withAlpha (a));
    g.fillRect ((float) x, cy - 0.5f, (float) w, 1.0f);
    // from the middle where the number runs either side of nought, as the site's meters
    const float zero = s.getMinimum() < 0.0 ? (float) x + (float) w * (float) s.valueToProportionOfLength (0.0) : (float) x;
    g.setColour (GREEN.withAlpha (a));
    g.fillRect (juce::jmin (zero, pos), cy - 1.5f, std::abs (pos - zero), 3.0f);
    g.setColour (INK.withAlpha (a));
    g.fillRect (pos - 3.0f, cy - 7.0f, 6.0f, 14.0f);
}

int AislingLook::getTabButtonBestWidth (juce::TabBarButton& b, int)
{
    return juce::roundToInt (juce::GlyphArrangement::getStringWidth (display (15.5f), b.getButtonText().toUpperCase())) + 26;
}

void AislingLook::drawTabButton (juce::TabBarButton& b, juce::Graphics& g, bool over, bool)
{
    const auto r = b.getLocalBounds().withTrimmedBottom (6);
    const bool now = b.isFrontTab();
    g.setColour (now ? GREEN : over ? STRIP : GROUND);
    g.fillRect (r);
    g.setColour (now ? GREEN : RULE);
    g.drawRect (r.withWidth (r.getWidth() + 1), 1);
    g.setColour (now ? GROUND : over ? GREEN : INK);
    g.setFont (display (15.5f));
    g.drawText (b.getButtonText().toUpperCase(), r.translated (0, 1), juce::Justification::centred, false);
}

AislingEditor::LayerPage::LayerPage (AislingProcessor& p, int layer)
{
    on.setButtonText (juce::String (AislingProcessor::LAYER_NAME[layer]).toLowerCase() + " plays its patch (off: the piece's own voice)");
    addAndMakeVisible (on);
    onAtt = std::make_unique<APVTS::ButtonAttachment> (p.apvts, AislingProcessor::onId (layer), on);
    for (int f = 0; f < AislingProcessor::NF; ++f)
    {
        const auto& fd = AislingProcessor::FIELDS[f];
        auto* l = labels.add (new juce::Label ({}, juce::String (fd.name).toLowerCase()));
        l->setColour (juce::Label::textColourId, MUTED);
        addAndMakeVisible (l);
        if (fd.shape)
        {
            auto* c = combos.add (new juce::ComboBox());
            c->addItemList ({ "saw", "pulse", "sine", "organ" }, 1);
            addAndMakeVisible (c);
            cAtt.push_back (std::make_unique<APVTS::ComboBoxAttachment> (p.apvts, AislingProcessor::pid (layer, f), *c));
            controls.push_back (c);
        }
        else
        {
            auto* s = sliders.add (new juce::Slider (juce::Slider::LinearHorizontal, juce::Slider::TextBoxRight));
            s->setTextBoxStyle (juce::Slider::TextBoxRight, false, 46, 20);
            addAndMakeVisible (s);
            sAtt.push_back (std::make_unique<APVTS::SliderAttachment> (p.apvts, AislingProcessor::pid (layer, f), *s));
            controls.push_back (s);
        }
    }
    if (layer != 1 && layer != 3)                       // (the attack: the Sequences' only)
    {
        controls[14]->setEnabled (false);
        labels[14]->setText ("attack (sequences)", juce::dontSendNotification);
        labels[14]->setAlpha (0.55f);
    }
}

void AislingEditor::LayerPage::resized()
{
    auto area = getLocalBounds().reduced (14, 10);
    on.setBounds (area.removeFromTop (26));
    area.removeFromTop (6);
    const int rows = 8, rowH = area.getHeight() / rows, colW = area.getWidth() / 2;
    for (int f = 0; f < AislingProcessor::NF; ++f)
    {
        juce::Rectangle<int> cell (area.getX() + (f / rows) * (colW + 8), area.getY() + (f % rows) * rowH, colW - 8, rowH);
        labels[f]->setBounds (cell.removeFromLeft (132));
        controls[(size_t) f]->setBounds (cell.reduced (0, 4));
    }
}

AislingEditor::AislingEditor (AislingProcessor& p) : AudioProcessorEditor (p), proc (p), wall (growWall ("plugin"))
{
    setLookAndFeel (&look);
    for (auto* c : std::initializer_list<juce::Component*> { &load, &own, &save, &copy, &packLabel, &status, &soloL, &midiL, &piece, &solo, &midi, &ownNotes, &run, &skip, &tabs })
        addAndMakeVisible (c);
    save.getProperties().set ("go", true);              // (the one to end with, filled green)
    save.setColour (juce::TextButton::textColourOffId, GROUND);
    packLabel.getProperties().set ("display", true);
    status.setColour (juce::Label::textColourId, RUST);
    status.setMinimumHorizontalScale (0.7f);
    for (auto* l : { &soloL, &midiL })
        l->setColour (juce::Label::textColourId, MUTED);
    solo.addItemList ({ "all", "drone", "sequence", "lead", "sequence 2" }, 1);
    midi.addItemList ({ "lead", "sequence", "sequence 2" }, 1);
    soloAtt = std::make_unique<APVTS::ComboBoxAttachment> (proc.apvts, "solo", solo);
    midiAtt = std::make_unique<APVTS::ComboBoxAttachment> (proc.apvts, "midi", midi);
    ownAtt = std::make_unique<APVTS::ButtonAttachment> (proc.apvts, "own", ownNotes);
    runAtt = std::make_unique<APVTS::ButtonAttachment> (proc.apvts, "run", run);
    skipAtt = std::make_unique<APVTS::ButtonAttachment> (proc.apvts, "skip", skip);
    tabs.setTabBarDepth (34);
    tabs.setOutline (0);
    for (int l = 0; l < AislingProcessor::NL; ++l)
        tabs.addTab (AislingProcessor::LAYER_NAME[l], juce::Colours::transparentBlack, new LayerPage (proc, l), true);
    tabs.setCurrentTabIndex (2);

    piece.onChange = [this] {
        const int i = piece.getSelectedItemIndex();
        if (i >= 0 && i != proc.piece())
            proc.setPiece (i, true), say ({});
    };
    load.onClick = [this] {
        chooser = std::make_unique<juce::FileChooser> ("An AISLING sound pack", proc.packFile.existsAsFile() ? proc.packFile : juce::File::getSpecialLocation (juce::File::userHomeDirectory), "*.aispack");
        chooser->launchAsync (juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this] (const juce::FileChooser& fc) {
            const auto f = fc.getResult();
            if (f == juce::File())
                return;
            say (proc.loadPack (f));
            refresh();
        });
    };
    own.onClick = [this] { proc.useOwn(); say ({}); refresh(); };
    save.onClick = [this] {
        if (! proc.hasPack())
        {
            say ("Load a pack first: AISLING's own pieces live in the firmware, not in a pack.");
            return;
        }
        chooser = std::make_unique<juce::FileChooser> ("Save the pack with this piece's patches", proc.packFile, "*.aispack");
        chooser->launchAsync (juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles | juce::FileBrowserComponent::warnAboutOverwriting, [this] (const juce::FileChooser& fc) {
            auto f = fc.getResult();
            if (f == juce::File())
                return;
            const auto why = proc.savePack (f.withFileExtension ("aispack"));
            say (why.isEmpty() ? "Saved: " + f.withFileExtension ("aispack").getFileName() + " (needs AISLING 1.6 where a piece has a patch)" : why);
            refresh();
        });
    };
    copy.onClick = [this] {
        juce::SystemClipboard::copyTextToClipboard (proc.patchJson());
        say ("Copied: the \"patch\" block for packs/NAME.json.");
    };
    refresh();
    if (! proc.owner())
        say ("Another AISLING is open in this set: only the first one plays. Remove this one.");
    setSize (940, 590);
}

AislingEditor::~AislingEditor() { setLookAndFeel (nullptr); }

void AislingEditor::say (const juce::String& s) { status.setText (s, juce::dontSendNotification); }

void AislingEditor::refresh()
{
    packLabel.setText (proc.packName().toUpperCase(), juce::dontSendNotification);
    piece.clear (juce::dontSendNotification);
    piece.addItemList (proc.pieceNames(), 1);
    piece.setSelectedItemIndex (proc.piece(), juce::dontSendNotification);
}

juce::Rectangle<int> AislingEditor::bench() const
{
    return { (getWidth() - BENCH) / 2, BAR + 16, BENCH, getHeight() - BAR - 32 };
}

void AislingEditor::paint (juce::Graphics& g)
{
    const auto b = bench();
    g.fillAll (GROUND);
    // the wall: fixed behind everything, shown only in the margins either side of the bench
    g.setImageResamplingQuality (juce::Graphics::lowResamplingQuality);
    g.setTiledImageFill (wall, getWidth() / 2 - wall.getWidth() / 2, 0, 0.18f);
    g.fillRect (0, BAR, getWidth(), getHeight() - BAR);
    g.setColour (GROUND);
    g.fillRect (b.getX() - 10, BAR, b.getWidth() + 20, getHeight() - BAR);
    g.setGradientFill ({ GROUND.withAlpha (0.0f), (float) b.getX() - 70.0f, 0.0f, GROUND, (float) b.getX() - 10.0f, 0.0f, false });
    g.fillRect (b.getX() - 70, BAR, 60, getHeight() - BAR);
    g.setGradientFill ({ GROUND, (float) b.getRight() + 10.0f, 0.0f, GROUND.withAlpha (0.0f), (float) b.getRight() + 70.0f, 0.0f, false });
    g.fillRect (b.getRight() + 10, BAR, 60, getHeight() - BAR);
    // the bar
    g.setColour (RULE);
    g.fillRect (0, BAR - 1, getWidth(), 1);
    g.setColour (INK);
    g.setFont (look.display (23.0f, 0.14f));
    g.drawText ("AISLING", b.getX(), 0, 130, BAR - 1, juce::Justification::centredLeft, false);
    g.setColour (GREEN);
    g.setFont (look.mono (12.5f));
    g.drawText ("the patch bench", b.getX() + 122, 2, 200, BAR - 1, juce::Justification::centredLeft, false);
    g.setColour (MUTED);
    g.drawText ("for the fm-1", b.getX(), 2, b.getWidth(), BAR - 1, juce::Justification::centredRight, false);
    // the bench: a hairline box, its header strip
    g.setColour (STRIP);
    g.fillRect (b.withHeight (HEAD));
    g.setColour (RULE);
    g.drawRect (b, 1);
    g.fillRect (b.getX(), b.getY() + HEAD, b.getWidth(), 1);
    g.fillRect (b.getX(), b.getBottom() - 47, b.getWidth(), 1);
}

void AislingEditor::resized()
{
    auto area = bench();
    auto top = area.removeFromTop (HEAD).reduced (12, 8);
    load.setBounds (top.removeFromLeft (128));
    top.removeFromLeft (6);
    own.setBounds (top.removeFromLeft (118));
    top.removeFromLeft (14);
    piece.setBounds (top.removeFromRight (190));
    packLabel.setBounds (top);
    auto bottom = area.removeFromBottom (47).reduced (12, 9);
    save.setBounds (bottom.removeFromLeft (176));
    bottom.removeFromLeft (6);
    copy.setBounds (bottom.removeFromLeft (112));
    bottom.removeFromLeft (10);
    status.setBounds (bottom);
    area = area.reduced (12, 0);
    area.removeFromTop (10);
    auto row = area.removeFromTop (28);
    soloL.setBounds (row.removeFromLeft (40));
    solo.setBounds (row.removeFromLeft (124));
    row.removeFromLeft (14);
    midiL.setBounds (row.removeFromLeft (84));
    midi.setBounds (row.removeFromLeft (124));
    row.removeFromLeft (16);
    ownNotes.setBounds (row);
    area.removeFromTop (2);
    row = area.removeFromTop (26);
    run.setBounds (row.removeFromLeft (262));
    skip.setBounds (row.removeFromLeft (160));
    area.removeFromTop (8);
    area.removeFromBottom (4);
    tabs.setBounds (area);
}
