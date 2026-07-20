import React from "react";
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from "react-native";

interface SmartHeroImageProps {
  imageUrl: string;
  focalPoint?: { x: number; y: number };
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  scale?: number;
}

export const SmartHeroImage: React.FC<SmartHeroImageProps> = ({
  imageUrl,
  focalPoint,
  style,
  imageStyle,
  scale = 1.3,
}) => {
  const fx = focalPoint?.x ?? 0.5;
  const fy = focalPoint?.y ?? 0.5;

  const leftOffset = ((-(scale - 1) * fx * 100)).toFixed(1) + "%";
  const topOffset = ((-(scale - 1) * fy * 100)).toFixed(1) + "%";

  const source = imageUrl.startsWith("asset://")
    ? { uri: imageUrl }
    : { uri: imageUrl };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={[
          styles.image,
          {
            width: (scale * 100).toFixed(0) + "%",
            height: (scale * 100).toFixed(0) + "%",
            left: leftOffset as any,
            top: topOffset as any,
          },
          imageStyle,
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
  },
});
