import React, { useState } from "react";
import { View, Image, StyleSheet, ViewStyle, ImageStyle, DimensionValue } from "react-native";

interface SmartHeroImageProps {
  imageUrl: string;
  focalPoint?: { x: number; y: number };
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  scale?: number;
  onError?: () => void;
}

export const SmartHeroImage: React.FC<SmartHeroImageProps> = ({
  imageUrl,
  focalPoint,
  style,
  imageStyle,
  scale = 1.3,
  onError,
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) return null;

  const fx = focalPoint?.x ?? 0.5;
  const fy = focalPoint?.y ?? 0.5;

  const leftOffset = ((0.5 - fx * scale) * 100).toFixed(1) + "%";
  const topOffset = ((0.5 - fy * scale) * 100).toFixed(1) + "%";

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
            width: ((scale * 100).toFixed(0) + "%") as DimensionValue,
            height: ((scale * 100).toFixed(0) + "%") as DimensionValue,
            left: leftOffset as any,
            top: topOffset as any,
          },
          imageStyle,
        ]}
        resizeMode="cover"
        onError={handleError}
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
