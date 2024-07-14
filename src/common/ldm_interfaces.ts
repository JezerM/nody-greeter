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

/**
 * Metadata that is sent to each window to handle more interesting multi-monitor
 * functionality / themes.
 */
interface WindowMetadata {
  // TODO: Remove this eslint-disable comment
  /* eslint-disable @typescript-eslint/naming-convention */
  id: number;
  is_primary: boolean;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  /**
   * The total real-estate across all screens,
   * this can be used to assist in, for example,
   * correctly positioning multi-monitor backgrounds.
   */
  overallBoundary: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
  WindowMetadata,
};
