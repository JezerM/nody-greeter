import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "common/ldm_interfaces";

import { LightDM } from "node-gtk";
import { BatteryController } from "../utils/battery";

function sessionToObject(
  session: LightDM.LightDMSession
): LightDMSession | null {
  if (!session) return null;
  return {
    comment: session.getComment(),
    key: session.getKey(),
    name: session.getName(),
    type: session.getSessionType(),
  };
}

function userToObject(user: LightDM.LightDMUser): LightDMUser | null {
  if (!user) return null;
  return {
    background: user.getBackground(),
    display_name: user.getDisplayName(),
    home_directory: user.getHomeDirectory(),
    image: user.getImage(),
    language: user.getLanguage(),
    layout: user.getLayout(),
    layouts: user.getLayouts(),
    logged_in: user.getLoggedIn(),
    session: user.getSession(),
    username: user.getName(),
  };
}

function languageToObject(
  lang: LightDM.LightDMLanguage
): LightDMLanguage | null {
  if (!lang) return null;
  return {
    code: lang.getCode(),
    name: lang.getName(),
    territory: lang.getTerritory(),
  };
}

function layoutToObject(layout: LightDM.LightDMLayout): LightDMLayout | null {
  if (!layout) return null;
  return {
    description: layout.getDescription(),
    name: layout.getName(),
    short_description: layout.getShortDescription(),
  };
}

function batteryToObject(battery: BatteryController): LightDMBattery | null {
  if (!battery) return null;
  if (battery._batteries.length == 0) return null;
  return {
    name: battery.name,
    level: battery.level,
    status: battery.status,
    ac_status: battery.acStatus,
    capacity: battery.capacity,
    time: battery.time,
    watt: battery.watt,
  };
}

export {
  sessionToObject,
  batteryToObject,
  languageToObject,
  layoutToObject,
  userToObject,
};
