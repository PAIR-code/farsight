# Farsight

Your visionary sidekick for responsible innovation!

![](https://screenshot.googleplex.com/3KQTJMw94Y7yXJo.png)
![](https://screenshot.googleplex.com/4QMDKwFvQ6hPZwV.png)

## What is Farsight?

Farsight is an interactive tool that helps large language model (LLM) prompt creators to envision potential harms associated with their AI applications.
With a novel progressive-disclosure design, personalized AI incident feed, and human-AI collaborative harm envisioning, Farsight helps prompt creators with diverse backgrounds to be more mindful of responsible AI from an early prototyping stage.

## Get Started

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

Navigate to [localhost:3030](https://localhost:3030). You should see Farsight running in your browser :)

## How is Farsight Built?

Farsight is a collection of [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) that developers can easily integrate into their web apps regardless of their development stack (e.g., Angular, React, Svelte). Farsight is written in TypeScript using [LIT Element](https://lit.dev/) as a framework. Farsight uses [D3.js](https://github.com/d3/d3) to implement the interactive tree visualization. The relevant AI incidents are from the [AI Incident Database](https://incidentdatabase.ai/), and the harm category is from the [sociotechnical harm taxonomy](https://arxiv.org/abs/2210.05791).

## Credits

Led by <a href='https://zijie.wang/' target='_blank'>Jay Wang</a>, Farsight is a result of a collaboration between researchers from Google Research, Georgia Tech, and Emory University. Farsight is created by <a href='https://zijie.wang/' target='_blank'>Jay Wang</a>, <a href='https://www.cs.emory.edu/people/faculty/individual.php?NUM=709' target='_blank'>Chinmay Kulkarni</a>, <a href='https://research.google/people/106542/' target='_blank'>Lauren Wilcox</a>, <a href='https://research.google/people/107786' target='_blank'>Mike Terry</a>, and <a href='http://michaelmadaio.com/' target='_blank'>Michael Madaio</a>.

## License

- The software is available under the [Apache License 2.0](https://github.com/PAIR-code/farsight/blob/master/LICENSE).
- The random prompts in [`public/data/random-prompts.json`](public/data/random-prompts.json`) are from [Awesome ChatGPT Prompts](https://github.com/f/awesome-chatgpt-prompts) with a [CC0 license](https://creativecommons.org/share-your-work/public-domain/cc0/).

## Contact

If you have any questions, feel free to [open an issue](https://github.com/PAIR-code/farsight/issues/new) or contact [Jay Wang](https://zijie.wang).
