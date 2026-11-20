// SPDX-License-Identifier: GPL-3.0-only
// AISLING as a plugin: the FM-1's engine playing a pack piece in the host's time, its four Patch voices as
// parameters, and the pack written back with them in it.
#pragma once

#include <juce_audio_utils/juce_audio_utils.h>

#include "glue.h"

class AislingProcessor : public juce::AudioProcessor
{
public:
    static constexpr int NL = 4, NF = AG_PATCH_N;
    struct Field { const char* id; const char* name; int lo, hi; bool shape; };
    static const Field FIELDS[NF];
    static const char* const LAYER_ID[NL];
    static const char* const LAYER_NAME[NL];
    static juce::String pid (int l, int f) { return juce::String (LAYER_ID[l]) + "_" + FIELDS[f].id; }
    static juce::String onId (int l) { return juce::String (LAYER_ID[l]) + "_on"; }

    AislingProcessor();
    ~AislingProcessor() override;

    void prepareToPlay (double sampleRate, int maximumExpectedSamplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported (const BusesLayout&) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "AISLING"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 8.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int) override;

    // The message thread's.
    bool owner() const { return isOwner; }             // the engine is one a process: the first AISLING has it
    juce::String loadPack (const juce::File&);          // "" or why not
    void useOwn();                                      // AISLING's own eight pieces
    void setPiece (int i, bool takeItsPatches);
    int piece() const { return pieceIx.load(); }
    bool hasPack() const { return packLen > 0; }
    juce::String packName() const;
    juce::StringArray pieceNames() const;
    juce::String savePack (const juce::File&);          // "" or why not
    juce::String patchJson() const;                     // the "patch" block for packs/NAME.json
    juce::File packFile;

    juce::AudioProcessorValueTreeState apvts;

private:
    static juce::AudioProcessorValueTreeState::ParameterLayout layout();
    void patchBytes (uint8_t out[NL][NF]) const;
    void pull (float* l, float* r, int n);
    void produce (float* l, float* r, int n);
    juce::String setPackBytes (const uint8_t* b, int len);

    bool isOwner = false;
    std::atomic<float>* raw[NL][NF] {};
    std::atomic<float>* rawOn[NL] {};
    std::atomic<float>* rawSolo = nullptr, *rawMidi = nullptr, *rawOwnNotes = nullptr, *rawRun = nullptr, *rawSkip = nullptr;

    juce::SpinLock packLock;                            // the pack: the message thread writes, the audio thread copies
    uint8_t pack[AG_PACK_MAX + 1] {};
    int packLen = 0;
    std::atomic<int> pieceIx { 0 };
    std::atomic<bool> loadPending { true };

    // The audio thread's.
    uint8_t aPack[AG_PACK_MAX + 1] {};
    int aLen = 0;
    uint8_t sent[NL][NF] {};
    int voiceSent[NL] { -1, -1, -1, -1 };
    bool sentValid = false, wasPlaying = false, extClock = false, freeOn = false;
    int muteSent = -1, handSent = -1, tempoSent = 0, skipSent = -1;
    double ratio = 1.0, engPpq = 0.0, beatsPerFrame = 0.0;
    juce::int64 nextTickIx = 0;
    juce::WindowedSincInterpolator rsL, rsR;
    std::vector<float> inL, inR;
    int have = 0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AislingProcessor)
};
