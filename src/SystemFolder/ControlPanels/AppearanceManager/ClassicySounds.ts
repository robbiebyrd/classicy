import { SoundData } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";

import platinumJson from "@snd/platinum/platinum.json";

const platinumOgg = new URL("../../../../assets/sounds/platinum/platinum.ogg", import.meta.url).href;
const platinumM4a = new URL("../../../../assets/sounds/platinum/platinum.m4a", import.meta.url).href;
const platinumMp3 = new URL("../../../../assets/sounds/platinum/platinum.mp3", import.meta.url).href;
const platinumAc3 = new URL("../../../../assets/sounds/platinum/platinum.ac3", import.meta.url).href;

const platinumSoundData: SoundData = {
  ...platinumJson,
  src: [platinumOgg, platinumM4a, platinumMp3, platinumAc3],
};

export const ClassicySounds: Record<string, SoundData | null> = {
  platinum: platinumSoundData,
};
