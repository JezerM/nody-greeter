// TODO: Remove this eslint-disable comment
/* eslint-disable @typescript-eslint/naming-convention */

interface LightDMLanguage {
  code: string;
  name: string;
  territory: string;
}

interface LightDMLayout {
  name: string;
  description: string;
  short_description: string;
}

interface LightDMUser {
  background: string;
  display_name: string;
  home_directory: string;
  image: string;
  language: string;
  layout: string;
  layouts: string[];
  logged_in: boolean;
  session: string;
  username: string;
}

interface LightDMSession {
  comment: string;
  key: string;
  name: string;
  type: string;
}

interface LightDMBattery {
  name: string;
  level: number;
  status: string;
  ac_status: boolean;
  capacity: number;
  time: string;
  watt: number;
}

export {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
};
