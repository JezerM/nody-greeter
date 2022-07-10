const defaultBackgrounds = [
  "assets/bubbles.svg",
  "assets/topography.svg",
  "assets/death star.svg",
];

interface BackgroundData {
  type: string;
  path: string;
}

export class Backgrounds {
  private _backgroundSelector: HTMLDivElement | null;
  private _backgroundSelectorBackButton: HTMLButtonElement | null;
  private _backgroundSelectorEnterButton: HTMLButtonElement | null;
  private _screenDiv: HTMLDivElement | null;

  private _backgroundSelectorList: HTMLDivElement | null;
  private _backgroundSelectorCurrent: HTMLDivElement | null;
  private _backgroundSelectorCurrentLabel: HTMLHeadingElement | null;
  private _backgroundElement: HTMLDivElement | null;
  private _backgroundImages: string[];
  private _backgroundImagesDir: string;
  private _backgroundPath: string;

  public constructor() {
    this._backgroundSelectorList = document.querySelector(
      "#background-selector-list"
    );
    this._backgroundSelectorCurrent = document.querySelector(
      "#current-background"
    );
    this._backgroundSelectorCurrentLabel = document.querySelector(
      "#current-background-label"
    );
    this._backgroundElement = document.querySelector("#background");

    this._backgroundSelector = document.querySelector("#background-selector");
    this._backgroundSelectorBackButton = document.querySelector(
      "#background-selector-back"
    );
    this._backgroundSelectorEnterButton = document.querySelector(
      "#background-selector-enter"
    );
    this._screenDiv = document.querySelector("#screen");

    this._backgroundImages = [];
    this._backgroundImagesDir = "";
    this._backgroundPath = "";

    /**
     * Background change requests are handled via broadcast events so that all
     * windows correctly update.
     */
    window.addEventListener("GreeterBroadcastEvent", (ev) => {
      const data: BackgroundData = ev.data as BackgroundData;
      if (data.type == "change-background") {
        this._backgroundPath = data.path;
        this.updateBackgroundImages();
      }
    });
  }

  public createImageElement(path: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.classList.add("image");
    button.style.backgroundImage = `url("${path}")`;

    return button;
  }

  public async createBackgroundArray(): Promise<void> {
    const images = await this.getBackgroundImages();
    this._backgroundImages = defaultBackgrounds.concat(images);
    this.setBackgroundImages();
    return new Promise((resolve) => resolve());
  }

  public updateOnStartup(): void {
    this._backgroundPath =
      window.localStorage.getItem("defaultBackgroundImage") ||
      this._backgroundImages[0];
    this.updateBackgroundImages();
  }

  public updateBackgroundImages(): void {
    if (!this._backgroundElement) return;

    const imageName = this._backgroundPath.replace(/^.*[\\/]/, "");
    if (this._backgroundSelectorCurrent) {
      this._backgroundSelectorCurrent.style.backgroundImage = `url("${this._backgroundPath}")`;
      if (imageName.endsWith(".svg")) {
        console.log(imageName, "SVG");
        this._backgroundSelectorCurrent.style.backgroundSize = "auto";
      } else {
        this._backgroundSelectorCurrent.style.backgroundSize = "";
      }
    }
    if (this._backgroundSelectorCurrentLabel) {
      this._backgroundSelectorCurrentLabel.innerText = imageName;
    }

    this._backgroundElement.style.backgroundImage = `url("${this._backgroundPath}")`;
    window.localStorage.setItem("defaultBackgroundImage", this._backgroundPath);
  }

  public setBackgroundImages(): void {
    if (!this._backgroundSelectorList) return;
    this._backgroundSelectorList.innerHTML = "";

    for (const path of this._backgroundImages) {
      const button = this.createImageElement(path);
      button.addEventListener("click", () => {
        if (window.greeter_comm) {
          window.greeter_comm.broadcast({
            type: "change-background",
            path,
          });
        } else {
          this._backgroundPath = path;
          this.updateBackgroundImages();
        }
      });
      this._backgroundSelectorList.appendChild(button);
    }
  }

  public getBackgroundImages(path?: string): Promise<string[]> {
    if (!window.greeter_config || !window.theme_utils)
      return new Promise((resolve) => resolve([]));

    this._backgroundImagesDir =
      window.greeter_config.branding.background_images_dir ||
      "/usr/share/backgrounds";

    return new Promise((resolve) => {
      window.theme_utils?.dirlist(
        path ? path : this._backgroundImagesDir,
        true,
        (result) => {
          resolve(result);
        }
      );
    });
  }

  public showBackgroundSelector(): void {
    if (!this._backgroundSelector || !this._screenDiv) return;
    this._backgroundSelector.classList.remove("hide");
    this._screenDiv.classList.add("hide");

    this.setBackgroundSelectorKeydown();
  }
  public hideBackgroundSelector(): void {
    if (!this._backgroundSelector || !this._screenDiv) return;
    this._backgroundSelector.classList.add("hide");
    this._screenDiv.classList.remove("hide");
  }

  public setBackgroundSelectorBackButton(): void {
    if (!this._backgroundSelectorBackButton) return;

    this._backgroundSelectorBackButton.addEventListener("click", () => {
      this.hideBackgroundSelector();
    });
  }
  public setBackgroundSelectorEnterButton(): void {
    if (!this._backgroundSelectorEnterButton) return;

    this._backgroundSelectorEnterButton.addEventListener("click", () => {
      this.showBackgroundSelector();
    });
  }
  public setBackgroundSelectorKeydown(): void {
    const callback = (ev: KeyboardEvent): void => {
      if (ev.key == "Escape") {
        this.hideBackgroundSelector();
        document
          .querySelector("body")
          ?.removeEventListener("keydown", callback);
      }
    };
    document.querySelector("body")?.addEventListener("keydown", callback);
  }

  public async init(): Promise<void> {
    this.setBackgroundSelectorBackButton();
    this.setBackgroundSelectorEnterButton();
    await this.createBackgroundArray();
    this.updateOnStartup();

    return new Promise((resolve) => resolve());
  }
}