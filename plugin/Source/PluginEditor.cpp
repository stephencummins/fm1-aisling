// SPDX-License-Identifier: GPL-3.0-only
#include "PluginEditor.h"

namespace
{
const juce::Colour INK (0xffe8e2d4), PAPER (0xff17181a), DIM (0xff8d8a82), GOLD (0xffd9a441);
}

AislingEditor::LayerPage::LayerPage (AislingProcessor& p, int layer)
{
    on.setButtonText (juce::String (AislingProcessor::LAYER_NAME[layer]) + " plays its Patch (off: the piece's own voice)");
    addAndMakeVisible (on);
    onAtt = std::make_unique<APVTS::ButtonAttachment> (p.apvts, AislingProcessor::onId (layer), on);
    for (int f = 0; f < AislingProcessor::NF; ++f)
    {
        const auto& fd = AislingProcessor::FIELDS[f];
        auto* l = labels.add (new juce::Label ({}, fd.name));
        l->setColour (juce::Label::textColourId, DIM);
        l->setFont (juce::FontOptions (12.0f));
        addAndMakeVisible (l);
        if (fd.shape)
        {
            auto* c = combos.add (new juce::ComboBox());
            c->addItemList ({ "Saw", "Pulse", "Sine", "Organ" }, 1);
            addAndMakeVisible (c);
            cAtt.push_back (std::make_unique<APVTS::ComboBoxAttachment> (p.apvts, AislingProcessor::pid (layer, f), *c));
            controls.push_back (c);
        }
        else
        {
            auto* s = sliders.add (new juce::Slider (juce::Slider::LinearHorizontal, juce::Slider::TextBoxRight));
            s->setTextBoxStyle (juce::Slider::TextBoxRight, false, 44, 18);
            s->setColour (juce::Slider::thumbColourId, GOLD);
            s->setColour (juce::Slider::trackColourId, GOLD.withAlpha (0.5f));
            addAndMakeVisible (s);
            sAtt.push_back (std::make_unique<APVTS::SliderAttachment> (p.apvts, AislingProcessor::pid (layer, f), *s));
            controls.push_back (s);
        }
    }
    if (layer != 1 && layer != 3)                       // (the attack: the Sequences' only)
        controls[14]->setEnabled (false), labels[14]->setText ("Attack (Sequences only)", juce::dontSendNotification);
}

void AislingEditor::LayerPage::resized()
{
    auto area = getLocalBounds().reduced (12, 8);
    on.setBounds (area.removeFromTop (26));
    area.removeFromTop (6);
    const int rows = 8, rowH = area.getHeight() / rows, colW = area.getWidth() / 2;
    for (int f = 0; f < AislingProcessor::NF; ++f)
    {
        juce::Rectangle<int> cell (area.getX() + (f / rows) * colW, area.getY() + (f % rows) * rowH, colW - 10, rowH);
        labels[f]->setBounds (cell.removeFromLeft (118));
        controls[(size_t) f]->setBounds (cell.reduced (0, 4));
    }
}

AislingEditor::AislingEditor (AislingProcessor& p) : AudioProcessorEditor (p), proc (p)
{
    for (auto* c : std::initializer_list<juce::Component*> { &load, &own, &save, &copy, &packLabel, &status, &soloL, &midiL, &piece, &solo, &midi, &ownNotes, &run, &skip, &tabs })
        addAndMakeVisible (c);
    packLabel.setColour (juce::Label::textColourId, INK);
    packLabel.setFont (juce::FontOptions (15.0f, juce::Font::bold));
    status.setColour (juce::Label::textColourId, GOLD);
    for (auto* l : { &soloL, &midiL })
        l->setColour (juce::Label::textColourId, DIM);
    solo.addItemList ({ "All", "Drone", "Sequence", "Lead", "Sequence 2" }, 1);
    midi.addItemList ({ "Lead", "Sequence", "Sequence 2" }, 1);
    soloAtt = std::make_unique<APVTS::ComboBoxAttachment> (proc.apvts, "solo", solo);
    midiAtt = std::make_unique<APVTS::ComboBoxAttachment> (proc.apvts, "midi", midi);
    ownAtt = std::make_unique<APVTS::ButtonAttachment> (proc.apvts, "own", ownNotes);
    runAtt = std::make_unique<APVTS::ButtonAttachment> (proc.apvts, "run", run);
    skipAtt = std::make_unique<APVTS::ButtonAttachment> (proc.apvts, "skip", skip);
    tabs.setColour (juce::TabbedComponent::backgroundColourId, PAPER);
    tabs.setColour (juce::TabbedComponent::outlineColourId, DIM.withAlpha (0.3f));
    for (int l = 0; l < AislingProcessor::NL; ++l)
        tabs.addTab (AislingProcessor::LAYER_NAME[l], PAPER.brighter (0.06f), new LayerPage (proc, l), true);
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
        say ("Copied: the \"patch\" block for the piece in packs/NAME.json (the layers that play their Patch).");
    };
    refresh();
    if (! proc.owner())
        say ("Another AISLING is open in this set: only the first one plays. Remove this one.");
    setSize (720, 470);
}

void AislingEditor::say (const juce::String& s) { status.setText (s, juce::dontSendNotification); }

void AislingEditor::refresh()
{
    packLabel.setText (proc.packName(), juce::dontSendNotification);
    piece.clear (juce::dontSendNotification);
    piece.addItemList (proc.pieceNames(), 1);
    piece.setSelectedItemIndex (proc.piece(), juce::dontSendNotification);
}

void AislingEditor::paint (juce::Graphics& g) { g.fillAll (PAPER); }

void AislingEditor::resized()
{
    auto area = getLocalBounds().reduced (12);
    auto top = area.removeFromTop (28);
    load.setBounds (top.removeFromLeft (120));
    top.removeFromLeft (6);
    own.setBounds (top.removeFromLeft (110));
    top.removeFromLeft (12);
    piece.setBounds (top.removeFromRight (200));
    packLabel.setBounds (top);
    area.removeFromTop (8);
    auto row = area.removeFromTop (26);
    soloL.setBounds (row.removeFromLeft (40));
    solo.setBounds (row.removeFromLeft (130));
    row.removeFromLeft (16);
    midiL.setBounds (row.removeFromLeft (76));
    midi.setBounds (row.removeFromLeft (130));
    row.removeFromLeft (16);
    ownNotes.setBounds (row);
    row = area.removeFromTop (26);
    run.setBounds (row.removeFromLeft (250));
    skip.setBounds (row.removeFromLeft (160));
    area.removeFromTop (6);
    auto bottom = area.removeFromBottom (28);
    save.setBounds (bottom.removeFromLeft (170));
    bottom.removeFromLeft (6);
    copy.setBounds (bottom.removeFromLeft (120));
    bottom.removeFromLeft (10);
    status.setBounds (bottom);
    area.removeFromBottom (8);
    tabs.setBounds (area);
}
