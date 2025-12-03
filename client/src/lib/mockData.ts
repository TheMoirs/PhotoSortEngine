
import sunnyBeach from "@assets/generated_images/sunny_beach_landscape.png";
import goldenRetriever from "@assets/generated_images/golden_retriever_dog.png";
import pastaDish from "@assets/generated_images/delicious_pasta_dish.png";
import hikingGroup from "@assets/generated_images/group_hiking.png";
import cityNight from "@assets/generated_images/city_skyline_night.png";
import coffeeLatte from "@assets/generated_images/coffee_shop_latte.png";

export interface FileItem {
  id: string;
  url: string;
  name: string;
  date: Date;
  type: 'image';
  size: string;
}

export const MOCK_FILES: FileItem[] = [
  {
    id: "1",
    url: sunnyBeach,
    name: "IMG_2023_0521.jpg",
    date: new Date("2023-05-21"),
    type: "image",
    size: "2.4 MB"
  },
  {
    id: "2",
    url: goldenRetriever,
    name: "park_day_doggo.jpg",
    date: new Date("2024-08-15"),
    type: "image",
    size: "3.1 MB"
  },
  {
    id: "3",
    url: pastaDish,
    name: "roman_dinner.jpg",
    date: new Date("2023-09-10"),
    type: "image",
    size: "1.8 MB"
  },
  {
    id: "4",
    url: hikingGroup,
    name: "trail_summit.jpg",
    date: new Date("2022-04-02"),
    type: "image",
    size: "4.2 MB"
  },
  {
    id: "5",
    url: cityNight,
    name: "downtown_lights.png",
    date: new Date("2024-12-31"),
    type: "image",
    size: "5.5 MB"
  },
  {
    id: "6",
    url: coffeeLatte,
    name: "morning_brew.jpg",
    date: new Date("2025-01-15"),
    type: "image",
    size: "1.2 MB"
  },
  {
    id: "7",
    url: sunnyBeach, // Reusing for volume
    name: "beach_day_2.jpg",
    date: new Date("2023-05-22"),
    type: "image",
    size: "2.1 MB"
  },
   {
    id: "8",
    url: hikingGroup, // Reusing for volume
    name: "trail_start.jpg",
    date: new Date("2022-04-02"),
    type: "image",
    size: "3.8 MB"
  }
];
