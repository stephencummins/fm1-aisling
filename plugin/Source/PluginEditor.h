// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#include "PluginProcessor.h"

class AislingEditor : public juce::AudioProcessorEditor
{
public:
    explicit AislingEditor (AislingProcessor&);
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    using APVTS = juce::AudioProcessorValueTreeState;
    struct LayerPage : juce::Component
    {
        LayerPage (AislingProcessor&, int layer);
        void resized() override;
        juce::ToggleButton on;
        juce::OwnedArray<juce::Label> labels;
        juce::OwnedArray<juce::Slider> sliders;         // (null where the field is a shape)
        juce::OwnedArray<juce::ComboBox> combos;
        std::vector<juce::Component*> controls;
        std::unique_ptr<APVTS::ButtonAttachment> onAtt;
        std::vector<std::unique_ptr<APVTS::SliderAttachment>> sAtt;
        std::vector<std::unique_ptr<APVTS::ComboBoxAttachment>> cAtt;
    };
    void refresh();
    void say (const juce::String&);

    AislingProcessor& proc;
    juce::TextButton load { "Load a pack..." }, own { "AISLING's own" }, save { "Save into the pack..." }, copy { "Copy as JSON" };
    juce::Label packLabel, status, soloL { {}, "Solo" }, midiL { {}, "Notes play" };
    juce::ComboBox piece, solo, midi;
    juce::ToggleButton ownNotes { "The piece plays its own Sequence notes" }, run { "Play while the host is stopped" }, skip { "Skip the intros" };
    juce::TabbedComponent tabs { juce::TabbedButtonBar::TabsAtTop };
    std::unique_ptr<APVTS::ComboBoxAttachment> soloAtt, midiAtt;
    std::unique_ptr<APVTS::ButtonAttachment> ownAtt, runAtt, skipAtt;
    std::unique_ptr<juce::FileChooser> chooser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AislingEditor)
};
