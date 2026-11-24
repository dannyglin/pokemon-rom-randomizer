# Design

## Source of truth

Active, 2026-11-24. This brief covers the Pocket Randomizer static browser build and local-engine pages. The two READMEs, their HTML entry points, the browser settings schema, and the upload and engine scripts define the supported workflows.

## Brand

Use the visual language of a Pokémon handheld adventure. A Poké Ball identifies the app, a pixel-art route sets the scene, and the ROM and engine status remain easy to find.

## Product goals

Help players load an owned game, understand where it runs, choose rules, and download the result.

## Personas and jobs

A returning player can load a game with the recommended settings. A player planning a particular challenge can inspect and change individual rules.

## Information architecture

The header shows engine status. The introduction lists supported systems. The workspace follows the order of play: choose a ROM, set rules, then randomize. Engine setup and output details stay near the steps they support.

## Design principles

Reserve pixel lettering for short titles. Give descriptive text and form controls room to breathe. Use game motifs to identify familiar objects such as a cartridge or item.

## Visual language

Parchment surfaces, pine ink, Poké Ball red, and grass green anchor the palette. A chunky handheld screen frames the route. Small hard shadows and clipped pixel details connect the controls to the illustration.

## Components

The base stylesheet owns the shell, handheld, upload target, local rule cards, and actions. The browser settings stylesheet owns the disclosure menus and generated fields. Match the two using shared color and type tokens.

## Accessibility

Pair every status color with text. Retain native form semantics, a visible keyboard focus indicator, and a polite live region. Treat decorative sprites as silent. Keep the layout usable with reduced motion and zoom.

## Responsive behavior

Place the screen beside the introduction on wide displays and below it on phones. Wrap the header controls, stack rule cards and form fields, and keep long filenames within the upload area.

## Interaction states

Differentiate keyboard focus, drag-over, file selection, checked rules, and disabled actions. Surface validation errors, progress, and download confirmation using the existing status text.

## Content voice

Use trainer-friendly language for headings and plain descriptions for settings, file formats, privacy, and prerequisites.

## Implementation constraints

Serve the artwork and title lettering locally. Keep each standalone distribution self-contained and preserve form hooks and CheerpJ attribution. Verify both engine modes and narrow-screen use.

## Open questions

None for this visual update.
