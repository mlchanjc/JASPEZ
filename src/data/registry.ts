import type { LessonFile, LevelId, LevelManifest } from "./types";

import n5_02 from "../../data/vocab/n5/02.json";
import n5_03 from "../../data/vocab/n5/03.json";
import n5_04 from "../../data/vocab/n5/04.json";
import n5_05 from "../../data/vocab/n5/05.json";
import n5_06 from "../../data/vocab/n5/06.json";
import n5_07 from "../../data/vocab/n5/07.json";
import n5_08 from "../../data/vocab/n5/08.json";
import n5_09 from "../../data/vocab/n5/09.json";
import n5_10 from "../../data/vocab/n5/10.json";
import n5_11 from "../../data/vocab/n5/11.json";
import n5_12 from "../../data/vocab/n5/12.json";
import n5_13 from "../../data/vocab/n5/13.json";
import n5_14 from "../../data/vocab/n5/14.json";
import n5_15 from "../../data/vocab/n5/15.json";
import n5_16 from "../../data/vocab/n5/16.json";
import n5_17 from "../../data/vocab/n5/17.json";
import n5_18 from "../../data/vocab/n5/18.json";
import n5_19 from "../../data/vocab/n5/19.json";
import n5_20 from "../../data/vocab/n5/20.json";
import n5_21 from "../../data/vocab/n5/21.json";
import n5Manifest from "../../data/vocab/n5/manifest.json";
import n4_01 from "../../data/vocab/n4/01.json";
import n4_02 from "../../data/vocab/n4/02.json";
import n4_03 from "../../data/vocab/n4/03.json";
import n4_04 from "../../data/vocab/n4/04.json";
import n4_05 from "../../data/vocab/n4/05.json";
import n4_06 from "../../data/vocab/n4/06.json";
import n4_07 from "../../data/vocab/n4/07.json";
import n4_08 from "../../data/vocab/n4/08.json";
import n4_09 from "../../data/vocab/n4/09.json";
import n4_10 from "../../data/vocab/n4/10.json";
import n4_11 from "../../data/vocab/n4/11.json";
import n4_12 from "../../data/vocab/n4/12.json";
import n4_13 from "../../data/vocab/n4/13.json";
import n4_14 from "../../data/vocab/n4/14.json";
import n4_15 from "../../data/vocab/n4/15.json";
import n4_16 from "../../data/vocab/n4/16.json";
import n4_17 from "../../data/vocab/n4/17.json";
import n4_18 from "../../data/vocab/n4/18.json";
import n4_19 from "../../data/vocab/n4/19.json";
import n4Manifest from "../../data/vocab/n4/manifest.json";
import n3_01 from "../../data/vocab/n3/01.json";
import n3_02 from "../../data/vocab/n3/02.json";
import n3_03 from "../../data/vocab/n3/03.json";
import n3_04 from "../../data/vocab/n3/04.json";
import n3_05 from "../../data/vocab/n3/05.json";
import n3_06 from "../../data/vocab/n3/06.json";
import n3_07 from "../../data/vocab/n3/07.json";
import n3_08 from "../../data/vocab/n3/08.json";
import n3_09 from "../../data/vocab/n3/09.json";
import n3_10 from "../../data/vocab/n3/10.json";
import n3_11 from "../../data/vocab/n3/11.json";
import n3_12 from "../../data/vocab/n3/12.json";
import n3_13 from "../../data/vocab/n3/13.json";
import n3_14 from "../../data/vocab/n3/14.json";
import n3_15 from "../../data/vocab/n3/15.json";
import n3_16 from "../../data/vocab/n3/16.json";
import n3_17 from "../../data/vocab/n3/17.json";
import n3_18 from "../../data/vocab/n3/18.json";
import n3_19 from "../../data/vocab/n3/19.json";
import n3_20 from "../../data/vocab/n3/20.json";
import n3_21 from "../../data/vocab/n3/21.json";
import n3_22 from "../../data/vocab/n3/22.json";
import n3_23 from "../../data/vocab/n3/23.json";
import n3_24 from "../../data/vocab/n3/24.json";
import n3_25 from "../../data/vocab/n3/25.json";
import n3Manifest from "../../data/vocab/n3/manifest.json";
import n2Manifest from "../../data/vocab/n2/manifest.json";
import n1Manifest from "../../data/vocab/n1/manifest.json";

export const LEVELS: LevelId[] = ["N5", "N4", "N3", "N2", "N1"];

export const manifests: Record<LevelId, LevelManifest> = {
  N5: n5Manifest as LevelManifest,
  N4: n4Manifest as LevelManifest,
  N3: n3Manifest as LevelManifest,
  N2: n2Manifest as LevelManifest,
  N1: n1Manifest as LevelManifest,
};

export const lessons: Record<LevelId, Record<string, LessonFile>> = {
  N5: {
    "02": n5_02 as LessonFile,
    "03": n5_03 as LessonFile,
    "04": n5_04 as LessonFile,
    "05": n5_05 as LessonFile,
    "06": n5_06 as LessonFile,
    "07": n5_07 as LessonFile,
    "08": n5_08 as LessonFile,
    "09": n5_09 as LessonFile,
    "10": n5_10 as LessonFile,
    "11": n5_11 as LessonFile,
    "12": n5_12 as LessonFile,
    "13": n5_13 as LessonFile,
    "14": n5_14 as LessonFile,
    "15": n5_15 as LessonFile,
    "16": n5_16 as LessonFile,
    "17": n5_17 as LessonFile,
    "18": n5_18 as LessonFile,
    "19": n5_19 as LessonFile,
    "20": n5_20 as LessonFile,
    "21": n5_21 as LessonFile,
  },
  N4: {
    "01": n4_01 as LessonFile,
    "02": n4_02 as LessonFile,
    "03": n4_03 as LessonFile,
    "04": n4_04 as LessonFile,
    "05": n4_05 as LessonFile,
    "06": n4_06 as LessonFile,
    "07": n4_07 as LessonFile,
    "08": n4_08 as LessonFile,
    "09": n4_09 as LessonFile,
    "10": n4_10 as LessonFile,
    "11": n4_11 as LessonFile,
    "12": n4_12 as LessonFile,
    "13": n4_13 as LessonFile,
    "14": n4_14 as LessonFile,
    "15": n4_15 as LessonFile,
    "16": n4_16 as LessonFile,
    "17": n4_17 as LessonFile,
    "18": n4_18 as LessonFile,
    "19": n4_19 as LessonFile,
  },
  N3: {
    "01": n3_01 as LessonFile,
    "02": n3_02 as LessonFile,
    "03": n3_03 as LessonFile,
    "04": n3_04 as LessonFile,
    "05": n3_05 as LessonFile,
    "06": n3_06 as LessonFile,
    "07": n3_07 as LessonFile,
    "08": n3_08 as LessonFile,
    "09": n3_09 as LessonFile,
    "10": n3_10 as LessonFile,
    "11": n3_11 as LessonFile,
    "12": n3_12 as LessonFile,
    "13": n3_13 as LessonFile,
    "14": n3_14 as LessonFile,
    "15": n3_15 as LessonFile,
    "16": n3_16 as LessonFile,
    "17": n3_17 as LessonFile,
    "18": n3_18 as LessonFile,
    "19": n3_19 as LessonFile,
    "20": n3_20 as LessonFile,
    "21": n3_21 as LessonFile,
    "22": n3_22 as LessonFile,
    "23": n3_23 as LessonFile,
    "24": n3_24 as LessonFile,
    "25": n3_25 as LessonFile,
  },
  N2: {

  },
  N1: {

  },
};
