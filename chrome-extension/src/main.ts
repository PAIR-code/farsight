import '@webcomponents/custom-elements';
import 'farsight/extension';
import {
  FarsightContainer,
  FarsightContainerLite,
  FarsightContainerSignal,
} from 'farsight/extension';

import './main.css';

class FarsightExtension {
  sidebarWrapper: HTMLElement | null = null;
  signalWrapper: HTMLElement | null = null;
  farsightWrapper: HTMLDialogElement | null = null;
  viewInitialized: boolean;

  signal: FarsightContainerSignal | null = null;
  farsightLite: FarsightContainerLite | null = null;
  farsight: FarsightContainer | null = null;

  showLite = false;

  constructor() {
    this.viewInitialized = false;
  }

  /**
   * Initialize the views.
   */
  initView() {
    const attachView = () => {
      try {
        this.bindRunButton();
        this.addSignal();
        this.addSidebar();
        this.addFarsight();
        this.viewInitialized = true;
      } catch (e) {
        setTimeout(() => {
          console.log('Trying to attach farsight, again...');
          attachView();
        }, 1000);
      }
    };
    attachView();
  }

  /**
   * Get the current prompt by scraping the editor element.
   * @returns Current prompt
   */
  getPromptText() {
    const editor = document.querySelector('.ql-editor');

    if (editor === null) {
      throw Error('Cannot load the editor element.');
    }

    // The editor puts each line in a div (including empty lines)
    // MS also puts output text in <span>, so we won't collect output text
    let promptText = '';
    const lineDivs = editor.querySelectorAll('div');

    for (const lineDiv of lineDivs) {
      promptText += `${lineDiv.innerText}\n`;
    }

    return promptText;
  }

  /**
   * Bind click listener to the button click event.
   */
  bindRunButton() {
    const button = document.querySelector<HTMLElement>('.run-button');
    if (button === null) {
      throw Error('Cannot load the run button.');
    }

    button.addEventListener('click', () => {
      const promptText = this.getPromptText();

      // Pass the prompt to Farsight components
      if (this.signal) {
        this.signal.setAttribute('prompt', promptText);
      }

      if (this.farsightLite) {
        this.farsightLite.setAttribute('prompt', promptText);
      }

      if (this.farsight) {
        this.farsight.setAttribute('prompt', promptText);
      }
    });
  }

  /**
   * Insert a signal element to the app.
   */
  addSignal() {
    const toolbarElement =
      document.querySelector<HTMLElement>('#quill-toolbar');
    const layoutElement = document.querySelector<HTMLElement>(
      '#quill-toolbar .toolbar-actions'
    );
    if (layoutElement === null || toolbarElement === null) {
      throw Error('Cannot load the prompt panel.');
    }
    toolbarElement.style.setProperty('height', '60px');

    // Create and add the signal container
    this.signalWrapper = document.createElement('div');
    this.signalWrapper.classList.add('farsight-signal-wrapper');

    this.signal = document.createElement('farsight-container-signal');
    this.signalWrapper.append(this.signal);

    // Bind interaction handlers
    this.signal.addEventListener('clicked', () => {
      // Launch the sidebar
      this.showLite = !this.showLite;
      if (this.showLite) {
        this.sidebarWrapper?.classList.remove('is-hidden');
      } else {
        this.sidebarWrapper?.classList.add('is-hidden');
      }
    });

    layoutElement.append(this.signalWrapper);
  }

  /**
   * Insert a sidebar element to the app.
   */
  addSidebar() {
    const layoutElement =
      document.querySelector<HTMLElement>('.makersuite-layout');
    if (layoutElement === null) {
      throw Error('Cannot load the laytout container.');
    }

    // Create and add the sidebar container
    this.sidebarWrapper = document.createElement('div');
    this.sidebarWrapper.classList.add('farsight-sidebar-wrapper');
    if (!this.showLite) {
      this.sidebarWrapper.classList.add('is-hidden');
    }

    this.farsightLite = document.createElement('farsight-container-lite');
    this.sidebarWrapper.append(this.farsightLite);

    // Bind interactions
    this.farsightLite.addEventListener('close-lite', () => {
      this.showLite = false;
      this.sidebarWrapper?.classList.add('is-hidden');
    });

    this.farsightLite.addEventListener('launch-farsight', () => {
      this.farsightWrapper?.showModal();
      if (this.farsight) {
        this.farsight.sizeDetermined = 'true';
      }
    });

    layoutElement.append(this.sidebarWrapper);
  }

  /**
   * Insert a dialog element that contains Farsight to the app.
   */
  addFarsight() {
    const layoutElement = document.querySelector<HTMLElement>('app-root');
    if (layoutElement === null) {
      console.error('Cannot load the laytout container.');
      return;
    }

    // Create and add the sidebar container
    this.farsightWrapper = document.createElement('dialog');
    this.farsightWrapper.classList.add('farsight-wrapper');

    this.farsight = document.createElement('farsight-container');
    this.farsightWrapper.append(this.farsight);

    // Close the dialog if user clicks outside of the box
    this.farsightWrapper.onclick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && this.farsightWrapper) {
        if (target.nodeName === 'DIALOG') {
          this.farsightWrapper.close();
        }
      }
    };

    // Bind interactions
    this.farsight?.addEventListener('close-farsight', () => {
      this.farsightWrapper?.close();
    });

    layoutElement.append(this.farsightWrapper);
  }
}

const farsightExtension = new FarsightExtension();

setTimeout(() => {
  farsightExtension.initView();
}, 1000);

console.log('Farsight loaded.');
