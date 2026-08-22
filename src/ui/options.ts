import "./theme.css";

export interface OptionsScreenState {
  volume: number;
  skipIntro: boolean;
}

export interface OptionsScreenCallbacks {
  onVolumeChange: (volume: number) => void;
  onSkipIntroChange: (skipIntro: boolean) => void;
  onBack: () => void;
}

/**
 * MOODBOARD.md: identical visual language to the title screen. Just volume
 * and a skip-intro toggle — nothing here references the reveal, before or
 * after the player has seen it.
 */
export function createOptionsScreen(
  state: OptionsScreenState,
  { onVolumeChange, onSkipIntroChange, onBack }: OptionsScreenCallbacks,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "screen screen--transparent";

  const title = document.createElement("div");
  title.className = "screen__title";
  title.textContent = "OPTIONS";

  const volumeRow = document.createElement("label");
  volumeRow.className = "options-row";
  const volumeLabel = document.createElement("span");
  volumeLabel.textContent = "Volume";
  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "100";
  volumeSlider.value = String(Math.round(state.volume * 100));
  volumeSlider.addEventListener("input", () => {
    onVolumeChange(Number(volumeSlider.value) / 100);
  });
  volumeRow.append(volumeLabel, volumeSlider);

  const skipIntroRow = document.createElement("label");
  skipIntroRow.className = "options-row";
  const skipIntroLabel = document.createElement("span");
  skipIntroLabel.textContent = "Skip Intro";
  const skipIntroCheckbox = document.createElement("input");
  skipIntroCheckbox.type = "checkbox";
  skipIntroCheckbox.checked = state.skipIntro;
  skipIntroCheckbox.addEventListener("change", () => {
    onSkipIntroChange(skipIntroCheckbox.checked);
  });
  skipIntroRow.append(skipIntroLabel, skipIntroCheckbox);

  const list = document.createElement("div");
  list.className = "menu-list";
  const back = document.createElement("button");
  back.className = "menu-item";
  back.textContent = "Back";
  back.addEventListener("click", onBack);
  list.append(back);

  root.append(title, volumeRow, skipIntroRow, list);
  return root;
}
