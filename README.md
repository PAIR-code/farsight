<h1>Farsight <a href="https://PAIR-code.github.io/farsight/"><img align="right" alt="Farsight logo." src="public/android-chrome-192x192.png" width="36" height="36"></a></h1>

[![Github Actions Status](https://github.com/PAIR-code/farsight/workflows/build/badge.svg)](https://github.com/PAIR-code/farsight/actions/workflows/build.yml)
[![license](https://img.shields.io/badge/License-Apache_2.0-blue)](https://github.com/PAIR-code/farsight/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@xiaohk/farsight?color=orange)](https://www.npmjs.com/package/@xiaohk/farsight)
[![pypi](https://img.shields.io/pypi/v/farsight?color=yellow)](https://pypi.org/project/farsight/)
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1aTIW3tRX1BRcNMCg8bRKktpZxRXtMF3-?usp=sharing)

<!-- [![arxiv badge](https://img.shields.io/badge/arXiv-2401.14447-red)](https://arxiv.org/abs/2401.14447) -->

In situ interactive widgets for responsible AI 🌱

<table>
  <tr>
    <td colspan="2"><a href="https://PAIR-code.github.io/farsight"><img width="100%" src='https://github.com/poloclub/wordflow/assets/15007159/c2f01503-9eb7-477c-be20-0b92a2efd1f0'></a></td>
  </tr>
  <tr></tr>
  <tr align="center">
    <td><a href="https://PAIR-code.github.io/farsight">🚀 Farsight Demo</a></td>
    <td><a href="https://youtu.be/BlSFbGkOlHk">📺 Demo Video</a></td>
    <!-- <td><a href="https://youtu.be/l1mr9z1TuAk">👨🏻‍🏫 Conference Talk</a></td> -->
    <!-- <td><a href="https://arxiv.org/abs/2401.14447">📖 Research Paper</a></td> -->
  </tr>
</table>

## What is Farsight?

Farsight is a collection of _in situ_ interactive widgets that help large language model (LLM) prompt creators to envision potential harms associated with their AI applications.
With a novel _in situ_ design, contextual AI incident feed, and human-AI collaborative harm envisioning, Farsight empowers prompt creators with diverse backgrounds to be more mindful of responsible AI during early AI prototyping.

<table>
  <td colspan="3">Widgets</td>
  <tr></tr>
  <tr>
    <td>1️⃣</td>
    <td><strong>Alert Symbol</strong></td>
    <td>Alert users with potential risks of their prompts and AI applications</td>
  </tr>
  <tr></tr>
  <tr>
  <td>2️⃣</td>
    <td><strong>Incident Panel</strong></td>
    <td>Relevant cautionary tales for users' AI applications</td>
  </tr>
  <tr></tr>
  <tr>
  <td>3️⃣</td>
    <td><strong>Use Case Panel</strong></td>
    <td>LLM-generated diverse use cases, stakeholders, and harms</td>
  </tr>
  <tr></tr>
  <tr>
  <td>4️⃣</td>
    <td><strong>Harm Envisioner</strong></td>
    <td>Human-AI collaborative harm envisioning tool</td>
  </tr>
  <tr></tr>
  <td colspan="3">Distributions</td>
  <tr></tr>
    <tr>
    <td>📦</td>
    <td><a href="https://pair-code.github.io/farsight/" >Live Demo</a></td>
    <td>Try Farsight with Gemini Pro and GPT-3.5</td>
  </tr>
  <tr></tr>
    <tr>
    <td>📦</td>
    <td><a href="https://github.com/PAIR-code/farsight/releases" >Chrome Extension</a></td>
    <td>Google AI Studio support</td>
  </tr>
  <tr></tr>
  <tr>
    <td>📦</td>
    <td><a href="https://pair-code.github.io/farsight/" >Python Package</a></td>
    <td>Computational notebook support (Jupyter, Colab, VS Code notebook)</td>
  </tr>
  <tr></tr>
</table>

## Features

<img width="100%" src='https://i.imgur.com/4VV0vGl.gif'>

### Demo Video

<video src="https://github.com/poloclub/wordflow/assets/15007159/ce96979e-9973-4c8c-9264-eec610b11463"></video>

## Get Started

### Live Demo

For a live demo, visit: <https://PAIR-code.github.io/farsight/>.

### Computational Notebook

If you use computational notebooks (e.g., Jupyter Notebook, JupyterLab, Google Colab, VS Code Notebook), you can easily use Farsight via its Python Package. We recommend using [StickyLand](https://github.com/xiaohk/stickyland) to enable sticky cells.

Visit this [Colab Notebook](https://colab.research.google.com/drive/1aTIW3tRX1BRcNMCg8bRKktpZxRXtMF3-?usp=sharing) for a demo.

```python
# Install Farsight
!pip install farsight

prompt = "Translate a sentence from English to French."

# Alert Symbol
farsight.symbol(prompt)

# Awareness Sidebar
farsight.sidebar(prompt)

# Harm Envisioner
farsight.envision(prompt)
```

### Google AI Studio

If you use Google AI Studio to prototype AI applications, you can manually install our Chrome Extension package from the [latest release](https://github.com/PAIR-code/farsight/releases).

1. Download `farsight.crx`
2. Open `chrome://extensions/` in Chrome
3. Drag `farsight.crx` into the page
4. Visit [Google AI Studio](https://aistudio.google.com/app/prompts/new_chat) and you will see Farsight :)

## Integrating Farsight into Prompting Tools

If you are a developer of web-based prompting tools, you can easily integrate different Farsight widgets into your tool regardless of your development stacks (e.g., React, Svelte, or Vanilla JS).

First, install Farsight's JavaScript package:

```bash
npm install --save-dev @xiaohk/farsight
```

Then, you can use Farsight as Web Components.

JavaScript:

```typescript
import '@xiaohk/farsight';
import {
  FarsightContainer,
  FarsightContainerLite,
  FarsightContainerSignal
} from '@xiaohk/farsight';
```

HTML:

```html
<farsight-container-signal
  prompt="Translate a sentence from English to French"
></farsight-container-signal>
```

## Developing Farsight

Clone or download this repository:

```bash
git clone git@github.com:PAIR-code/farsight.git
```

Install the dependencies:

```bash
npm install
```

Then run Farsight:

```bash
npm run dev
```

Navigate to [localhost:3000](https://localhost:3000). You should see Farsight running in your browser :)

## How is Farsight Built?

Farsight is a collection of [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) that developers can easily integrate into their web apps regardless of their development stack (e.g., Angular, React, Svelte). Farsight is written in TypeScript using [LIT Element](https://lit.dev/) as a framework. Farsight uses [D3.js](https://github.com/d3/d3) to implement the interactive tree visualization. The relevant AI incidents are from the [AI Incident Database](https://incidentdatabase.ai/), and the harm category is from the [sociotechnical harm taxonomy](https://arxiv.org/abs/2210.05791). The computational notebook support is enabled by [NOVA](https://github.com/poloclub/nova).

## Credits

Led by <a href='https://zijie.wang/' target='_blank'>Jay Wang</a>, Farsight is a result of a collaboration between researchers from Google Research, Georgia Tech, eBay, and Emory University. Farsight is created by <a href='https://zijie.wang/' target='_blank'>Jay Wang</a>, <a href='https://www.cs.emory.edu/people/faculty/individual.php?NUM=709' target='_blank'>Chinmay Kulkarni</a>, <a href='https://research.google/people/106542/' target='_blank'>Lauren Wilcox</a>, <a href='https://research.google/people/107786' target='_blank'>Mike Terry</a>, and <a href='http://michaelmadaio.com/' target='_blank'>Michael Madaio</a>.

## License

- The software is available under the [Apache License 2.0](https://github.com/PAIR-code/farsight/blob/master/LICENSE).
- The random prompts in [`public/data/random-prompts.json`](public/data/random-prompts.json`) are from [Awesome ChatGPT Prompts](https://github.com/f/awesome-chatgpt-prompts) with a [CC0 license](https://creativecommons.org/share-your-work/public-domain/cc0/).

## Contact

If you have any questions, feel free to [open an issue](https://github.com/PAIR-code/farsight/issues/new) or contact [Jay Wang](https://zijie.wang).
