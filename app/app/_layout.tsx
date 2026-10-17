import { Stack } from 'expo-router';

// Each screen shows its own title, so the header only carries the back arrow, in the app's
// dark colours. The home screen has no header.
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        title: '',
        headerStyle: { backgroundColor: '#0D0B09' },
        headerTintColor: '#F5EFE6',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#0D0B09' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
