import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "../ldm_interfaces";

// eslint-disable-next-line
function session_to_obj(session: any): LightDMSession | object {
  if (!session) return {};
  return {
    comment: session.getComment(),
    key: session.getKey(),
    name: session.getName(),
    type: session.getSessionType(),
  };
}

// eslint-disable-next-line
function user_to_obj(user: any): LightDMUser | object {
  if (!user) return {};
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
function language_to_obj(lang: any): LightDMLanguage | object {
  if (!lang) return {};
  return {
    code: lang.getCode(),
    name: lang.getName(),
    territory: lang.getTerritory(),
  };
}

// eslint-disable-next-line
function layout_to_obj(layout: any): LightDMLayout | object {
  if (!layout) return {};
  return {
    description: layout.getDescription(),
    name: layout.getName(),
    short_description: layout.getShortDescription(),
  };
}

// eslint-disable-next-line
function battery_to_obj(battery: any): LightDMBattery | object {
  if (!battery) return {};
  if (battery._batteries.length == 0) return {};
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
