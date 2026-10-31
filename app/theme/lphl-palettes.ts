// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Made for LPHL - lphl.nekten.eu - by Nekten - lphl@nekten.eu -
// Generated from the LPHL palettes (lphl-palettes.json, design zip). Do not edit by hand.

export interface LphlModeColors {
  bg: string;
  text: string;
  accent: string;
  /** Accent for filled areas (buttons, hero); readable with onAccent. */
  accentField: string;
  onAccent: string;
  danger: string;
  neutral: Record<Shade, string>;
  accentRamp: Record<Shade, string>;
}

export type Shade = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export const LPHL_PALETTE_ORDER = ['house', 'thermaikos', 'vardaris', 'kipos', 'keramidi', 'lychnari', 'vesperi', 'modernist', 'rodakini', 'fistiki', 'galazio', 'lila'] as const;

export type LphlPaletteName = (typeof LPHL_PALETTE_ORDER)[number];

export const LPHL_PALETTES: Record<LphlPaletteName, { light: LphlModeColors; dark: LphlModeColors }> = {
  house: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#ff9900',
      accentField: '#ff9900',
      onAccent: '#16211a',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#fff0d7',
        '200': '#ffdcab',
        '300': '#ffc274',
        '400': '#fe9e27',
        '500': '#df7c00',
        '600': '#c16500',
        '700': '#9a4b00',
        '800': '#6f3200',
        '900': '#4d2400'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#ff9900',
      accentField: '#ff9900',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#4d2400',
        '200': '#6f3200',
        '300': '#9a4b00',
        '400': '#c16500',
        '500': '#df7c00',
        '600': '#fe9e27',
        '700': '#ffc274',
        '800': '#ffdcab',
        '900': '#fff0d7'
      }
    }
  },
  thermaikos: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#2f7fc4',
      accentField: '#26679f',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#e5f8ff',
        '200': '#c6edff',
        '300': '#a1daff',
        '400': '#74beff',
        '500': '#509ee5',
        '600': '#3b85c7',
        '700': '#26679f',
        '800': '#134873',
        '900': '#113250'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#58a9e8',
      accentField: '#58a9e8',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#10334d',
        '200': '#12496f',
        '300': '#24689a',
        '400': '#3a87c0',
        '500': '#4e9fde',
        '600': '#73bffc',
        '700': '#a0dbff',
        '800': '#c6edff',
        '900': '#e5f8ff'
      }
    }
  },
  vardaris: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#17827f',
      accentField: '#1f716e',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#e5faf9',
        '200': '#c7f2ef',
        '300': '#a0e3df',
        '400': '#72c9c5',
        '500': '#4baaa6',
        '600': '#35908d',
        '700': '#1f716e',
        '800': '#0c4f4e',
        '900': '#0e3736'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#46bdb6',
      accentField: '#46bdb6',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#023936',
        '200': '#00514d',
        '300': '#00736e',
        '400': '#14938d',
        '500': '#31ada6',
        '600': '#60ccc5',
        '700': '#95e5df',
        '800': '#c0f4ef',
        '900': '#e2fbf9'
      }
    }
  },
  kipos: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#4a8b2c',
      accentField: '#3e7326',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#eafbe4',
        '200': '#d1f4c5',
        '300': '#b2e59f',
        '400': '#8bcc72',
        '500': '#6aac4f',
        '600': '#55933a',
        '700': '#3e7326',
        '800': '#275114',
        '900': '#1d3811'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#7cc456',
      accentField: '#7cc456',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#1c3909',
        '200': '#255204',
        '300': '#3b7415',
        '400': '#52942a',
        '500': '#67ae3f',
        '600': '#89cd66',
        '700': '#b0e796',
        '800': '#d0f5bf',
        '900': '#e9fce1'
      }
    }
  },
  keramidi: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#b4502a',
      accentField: '#9a4829',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#ffeee4',
        '200': '#ffd9c5',
        '300': '#ffbd9f',
        '400': '#ff9874',
        '500': '#df7751',
        '600': '#c1613e',
        '700': '#9a4829',
        '800': '#6f2f17',
        '900': '#4d2212'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#e08055',
      accentField: '#e08055',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#4b2412',
        '200': '#6c3216',
        '300': '#964b28',
        '400': '#bd653c',
        '500': '#db7b50',
        '600': '#fa9c73',
        '700': '#ffc09f',
        '800': '#ffdbc4',
        '900': '#ffefe3'
      }
    }
  },
  lychnari: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#a8751a',
      accentField: '#835a0e',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#fff3e0',
        '200': '#ffe3bd',
        '300': '#f6cd92',
        '400': '#e0ad61',
        '500': '#c28d39',
        '600': '#a67624',
        '700': '#835a0e',
        '800': '#5e3e00',
        '900': '#412c07'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#f2c230',
      accentField: '#f2c230',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#402d00',
        '200': '#5d4000',
        '300': '#825d00',
        '400': '#a47900',
        '500': '#bf9100',
        '600': '#deb126',
        '700': '#f4d074',
        '800': '#fde6ab',
        '900': '#fff4d8'
      }
    }
  },
  vesperi: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#6b4fa8',
      accentField: '#6b4fa8',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#f6f1ff',
        '200': '#ebdfff',
        '300': '#d9c7ff',
        '400': '#bea6ff',
        '500': '#a085e3',
        '600': '#876ec5',
        '700': '#69539e',
        '800': '#4a3872',
        '900': '#33284f'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#a78cdd',
      accentField: '#a78cdd',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#34294a',
        '200': '#4b3a6b',
        '300': '#6b5595',
        '400': '#8970ba',
        '500': '#a287d8',
        '600': '#c1a7f6',
        '700': '#dcc8ff',
        '800': '#ede0ff',
        '900': '#f7f1ff'
      }
    }
  },
  modernist: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#ec3013',
      accentField: '#b71b01',
      onAccent: '#edefea',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#ffe8de',
        '200': '#ffccb9',
        '300': '#ffa68d',
        '400': '#ff765a',
        '500': '#ff4c31',
        '600': '#e4351b',
        '700': '#b71b01',
        '800': '#850500',
        '900': '#5c0e04'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#ff6a4d',
      accentField: '#ff6a4d',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#56180d',
        '200': '#7c1e0c',
        '300': '#ab341d',
        '400': '#d54b31',
        '500': '#f66245',
        '600': '#ff8669',
        '700': '#ffb098',
        '800': '#ffd2c0',
        '900': '#ffebe1'
      }
    }
  },
  rodakini: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#f0a07a',
      accentField: '#f0a07a',
      onAccent: '#16211a',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#fff0e6',
        '200': '#ffdeca',
        '300': '#ffc4a7',
        '400': '#efa27e',
        '500': '#cf825d',
        '600': '#b36b49',
        '700': '#8e5133',
        '800': '#66371f',
        '900': '#472717'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#f7bfa2',
      accentField: '#f7bfa2',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#402b1f',
        '200': '#5c3c2b',
        '300': '#825842',
        '400': '#a4735a',
        '500': '#bf8b6f',
        '600': '#deaa8f',
        '700': '#f4cab4',
        '800': '#fee1d2',
        '900': '#fff2ea'
      }
    }
  },
  fistiki: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#9dc489',
      accentField: '#9dc489',
      onAccent: '#16211a',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#eff9ea',
        '200': '#dbefd1',
        '300': '#c1dfb2',
        '400': '#9fc48c',
        '500': '#7fa56c',
        '600': '#698c57',
        '700': '#4f6d3f',
        '800': '#364d29',
        '900': '#26361e'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#bcd9ac',
      accentField: '#bcd9ac',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#293423',
        '200': '#3a4b31',
        '300': '#556b49',
        '400': '#708962',
        '500': '#87a277',
        '600': '#a6c197',
        '700': '#c6dcbb',
        '800': '#dfedd7',
        '900': '#f0f8ec'
      }
    }
  },
  galazio: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#92b9dd',
      accentField: '#92b9dd',
      onAccent: '#16211a',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#ecf7ff',
        '200': '#d7ebfe',
        '300': '#bad8f4',
        '400': '#97bcde',
        '500': '#779dc0',
        '600': '#6184a4',
        '700': '#486782',
        '800': '#30485d',
        '900': '#223240'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#b3d1ea',
      accentField: '#b3d1ea',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#26323c',
        '200': '#364756',
        '300': '#506679',
        '400': '#69849a',
        '500': '#809cb4',
        '600': '#9fbbd3',
        '700': '#c1d8ea',
        '800': '#dbeaf7',
        '900': '#eff6fd'
      }
    }
  },
  lila: {
    light: {
      bg: '#edefea',
      text: '#16211a',
      accent: '#b4a2d6',
      accentField: '#b4a2d6',
      onAccent: '#16211a',
      danger: '#9e1c14',
      neutral: {
        '100': '#f2f6f4',
        '200': '#e3eae5',
        '300': '#ccd7d0',
        '400': '#aebbb3',
        '500': '#8e9c94',
        '600': '#77847c',
        '700': '#5b6660',
        '800': '#3f4742',
        '900': '#2c322e'
      },
      accentRamp: {
        '100': '#f7f2ff',
        '200': '#ece3fe',
        '300': '#daccf5',
        '400': '#beaddf',
        '500': '#a08ec1',
        '600': '#8776a5',
        '700': '#695b83',
        '800': '#4a3e5d',
        '900': '#332c41'
      }
    },
    dark: {
      bg: '#141a16',
      text: '#e6e9e3',
      accent: '#cdc0e6',
      accentField: '#cdc0e6',
      onAccent: '#141a16',
      danger: '#ff8a7a',
      neutral: {
        '100': '#30312e',
        '200': '#444642',
        '300': '#626460',
        '400': '#7f817c',
        '500': '#979994',
        '600': '#b6b8b3',
        '700': '#d3d5d1',
        '800': '#e7e8e5',
        '900': '#f5f5f4'
      },
      accentRamp: {
        '100': '#322d3c',
        '200': '#484056',
        '300': '#675d7a',
        '400': '#85799b',
        '500': '#9e91b5',
        '600': '#bdb0d4',
        '700': '#d8cfeb',
        '800': '#ebe4f8',
        '900': '#f6f3fd'
      }
    }
  }
};
