import { View } from 'react-native';

import { withAlpha } from '../theme/colors';
import { gradientStyle } from './glass';
import { PersonSign } from './shortcut-tile';

// Chat with myself's picture (app/myself.tsx, its row at the top of the chats): a person on a teal
// disc, unlike any contact's, whose picture is drawn from their key (key-face.tsx).

const TOP = '#5eead4';
const BOTTOM = '#0d9488';

export function MyselfFace({ size = 48 }: { size?: number }) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: BOTTOM },
        { boxShadow: `inset 0px 1px 0px ${withAlpha('#ffffff', 0.3)}` },
        gradientStyle(`linear-gradient(160deg, ${TOP} 0%, ${BOTTOM} 100%)`),
      ]}
    >
      <PersonSign size={Math.round(size * 0.5)} />
    </View>
  );
}
