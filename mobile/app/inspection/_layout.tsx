import React from "react";
import { Stack } from "expo-router";
import { COLORS } from "../../constants/theme";

export default function InspectionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="site" />
      <Stack.Screen name="checklist" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="observation" />
      <Stack.Screen name="review" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
