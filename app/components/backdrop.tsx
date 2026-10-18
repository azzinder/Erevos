import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rawAccent } from '../theme/colors';
import { useTheme } from '../theme/context';
import { backdropKind, frostedWall, glassHaze, glassPane, glassSide, glowLayer, paneFrame, wallLayers, type GlassSide } from '../theme/glass';

import { gradientStyle } from './glass';
import { AuroraLight, MatrixRain, NeonGrid, RuledPaper } from './scenes';

// What is drawn behind the screens, as in LPHL FASOULI (src/components/backdrop.tsx there):
// Nocturne's glow, Neon's grid, Matrix's rain (components/scenes.tsx), or the glass's wallpaper
// with its haze or its one pane.

/**
 * What a backdrop draws: Nocturne's glow, Neon's grid, Matrix's rain, or the glass's wallpaper (on
 * its side, tinted with the accent), with one pane over it or not.
 */
export interface BackdropSpec {
  kind: 'glow' | 'wall' | 'grid' | 'rain' | 'ruled' | 'aurora';
  side: GlassSide;
  accent: string;
  sheet: boolean;
}

/** The water lines: 1 px every 12 px over the lowest 38% of the wallpaper. */
function WaterLines({ color }: { color: string }) {
  const [height, setHeight] = useState(0);
  const box = { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%' } as const;
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[box, gradientStyle(`repeating-linear-gradient(to bottom, ${color} 0px, ${color} 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 12px)`)]}
      />
    );
  }
  // Phones: React Native has no repeating gradient; one thin view per line.
  return (
    <View pointerEvents="none" style={box} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {Array.from({ length: Math.ceil(height / 12) }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 12, height: 1, backgroundColor: color }} />
      ))}
    </View>
  );
}

/**
 * Draws behind a screen what its look asks for, with the screen on top: Nocturne's glow from the
 * top-left corner, or the glass's wallpaper. Under panes the wallpaper lies under its haze, edge
 * to edge (the screen's cards are the glass over it); under one pane, a frosted pane lies where
 * the screen's text does, the wallpaper showing through it frosted, as the site's sheet blurs and
 * saturates it. `paneTop` is where the pane starts (under the status bar or the header);
 * `contentTop` pads the screen below a header drawn over the backdrop. Without a spec it is only
 * the screen.
 */
export function Backdrop({ spec, paneTop = 0, contentTop = 0, children }: {
  spec: BackdropSpec | null;
  paneTop?: number;
  contentTop?: number;
  children: ReactNode;
}) {
  // Its own size; the window's until measured, and the last one while it is hidden (0 by 0).
  const window = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = box ?? window;
  const measure = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) setBox({ width: w, height: h });
  };
  if (!spec) return <>{children}</>;
  const content = <View style={{ flex: 1, paddingTop: contentTop }}>{children}</View>;
  if (spec.kind !== 'glow' && spec.kind !== 'wall') {
    const Scene = { grid: NeonGrid, rain: MatrixRain, ruled: RuledPaper, aurora: AuroraLight }[spec.kind];
    return (
      <View style={{ flex: 1 }} onLayout={measure}>
        <Scene width={width} height={height} />
        {content}
      </View>
    );
  }
  if (spec.kind === 'glow') {
    return (
      <View style={{ flex: 1, backgroundColor: '#161826' }} onLayout={measure}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, gradientStyle(glowLayer(width))]} />
        {content}
      </View>
    );
  }
  const wall = wallLayers(spec.side, spec.accent);
  return (
    <View style={{ flex: 1, backgroundColor: wall.base }} onLayout={measure}>
      {wall.layers.map((layer, i) => (
        <View key={i} pointerEvents="none" style={[StyleSheet.absoluteFill, gradientStyle(layer)]} />
      ))}
      <WaterLines color={wall.lines} />
      {spec.sheet ? (
        <Pane spec={spec} top={paneTop} width={width} height={height} />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: glassHaze(spec.side) }]} />
      )}
      {content}
    </View>
  );
}

/** The one pane, from `top` to the foot: the frosted wallpaper behind its glass, its edge, highlight and shadow. */
function Pane({ spec, top, width, height }: { spec: BackdropSpec; top: number; width: number; height: number }) {
  const frost = frostedWall(spec.side, spec.accent);
  const pane = glassPane(spec.side);
  const frame = paneFrame(width);
  const edge = 1;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        bottom: 0,
        left: frame.left,
        width: frame.width,
        borderTopLeftRadius: frame.radius,
        borderTopRightRadius: frame.radius,
        borderWidth: edge,
        borderBottomWidth: 0,
        borderColor: pane.edge,
        boxShadow: pane.shadow,
        overflow: 'hidden',
      }}
    >
      {/* The whole frosted wallpaper, placed so that each point lies over the same point of the wallpaper. */}
      <View style={{ position: 'absolute', top: -(top + edge), left: -(frame.left + edge), width, height, backgroundColor: frost.base }}>
        {frost.layers.map((layer, i) => (
          <View key={i} style={[StyleSheet.absoluteFill, gradientStyle(layer)]} />
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: pane.fill,
          borderTopLeftRadius: frame.radius - edge,
          borderTopRightRadius: frame.radius - edge,
          boxShadow: `inset 0px 1px 0px ${pane.hi}`,
        }}
      />
    </View>
  );
}

/** The backdrop the open look asks for, or null (flat, not Nocturne). */
export function useBackdropSpec(): BackdropSpec | null {
  const { look, scheme } = useTheme();
  const kind = backdropKind(look.style, look.look);
  if (!kind) return null;
  return {
    kind,
    side: glassSide(scheme),
    accent: rawAccent(look.style, scheme, look.palette, look.customAccent),
    sheet: kind === 'wall' && look.glassKind === 'sheet',
  };
}

/**
 * A screen's backdrop (the root stack's screenLayout, the password screen): under a header, which
 * the look draws see-through over it, the screen starts below the header, and one pane at its
 * foot; without one, the pane starts below the status bar.
 */
export function ScreenBackdrop({ children }: { children: ReactNode }) {
  const spec = useBackdropSpec();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  return (
    <Backdrop spec={spec} paneTop={headerHeight > 0 ? headerHeight : insets.top} contentTop={headerHeight}>
      {children}
    </Backdrop>
  );
}
