import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "../ldm_interfaces";

import { LightDM } from "node-gtk";
import { Battery } from "../utils/battery";

// eslint-disable-next-line
function session_to_obj(
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

// eslint-disable-next-line
function user_to_obj(user: LightDM.LightDMUser): LightDMUser | null {
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

// eslint-disable-next-line
function language_to_obj(
  lang: LightDM.LightDMLanguage
): LightDMLanguage | null {
  if (!lang) return null;
  return {
    code: lang.getCode(),
    name: lang.getName(),
    territory: lang.getTerritory(),
  };
}

// eslint-disable-next-line
function layout_to_obj(layout: LightDM.LightDMLayout): LightDMLayout | null {
  if (!layout) return null;
  return {
    description: layout.getDescription(),
    name: layout.getName(),
    short_description: layout.getShortDescription(),
  };
}

// eslint-disable-next-line
function battery_to_obj(battery: Battery): LightDMBattery | null {
  if (!battery) return null;
  if (battery._batteries.length == 0) return null;
  return {
    name: battery.name,
    level: battery.level,
    status: battery.status,
    ac_status: battery.ac_status,
    capacity: battery.capacity,
    time: battery.time,
    watt: battery.watt,
  };
}

export {
  session_to_obj,
  battery_to_obj,
  language_to_obj,
  layout_to_obj,
  user_to_obj,
};
