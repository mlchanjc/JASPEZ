import type { LevelId, GrammarLesson } from "./types";

import g_n5_00 from "../../data/grammar/n5/00.json";
import g_n5_01 from "../../data/grammar/n5/01.json";
import g_n5_02 from "../../data/grammar/n5/02.json";
import g_n5_03 from "../../data/grammar/n5/03.json";
import g_n5_04 from "../../data/grammar/n5/04.json";
import g_n5_05 from "../../data/grammar/n5/05.json";
import g_n5_06 from "../../data/grammar/n5/06.json";
import g_n5_07 from "../../data/grammar/n5/07.json";
import g_n5_08 from "../../data/grammar/n5/08.json";
import g_n5_09 from "../../data/grammar/n5/09.json";
import g_n5_10 from "../../data/grammar/n5/10.json";
import g_n5_11 from "../../data/grammar/n5/11.json";
import g_n5_12 from "../../data/grammar/n5/12.json";
import g_n5_13 from "../../data/grammar/n5/13.json";
import g_n5_14 from "../../data/grammar/n5/14.json";
import g_n5_15 from "../../data/grammar/n5/15.json";
import g_n5_16 from "../../data/grammar/n5/16.json";
import g_n5_17 from "../../data/grammar/n5/17.json";
import g_n5_18 from "../../data/grammar/n5/18.json";
import g_n5_19 from "../../data/grammar/n5/19.json";
import g_n5_20 from "../../data/grammar/n5/20.json";
import g_n5_21 from "../../data/grammar/n5/21.json";
import g_n5_22 from "../../data/grammar/n5/22.json";
import g_n5_23 from "../../data/grammar/n5/23.json";
import g_n5_24 from "../../data/grammar/n5/24.json";
import g_n5_25 from "../../data/grammar/n5/25.json";
import g_n5_26 from "../../data/grammar/n5/26.json";
import g_n5_27 from "../../data/grammar/n5/27.json";
import g_n5_28 from "../../data/grammar/n5/28.json";
import g_n5_29 from "../../data/grammar/n5/29.json";
import g_n5_30 from "../../data/grammar/n5/30.json";
import g_n5_31 from "../../data/grammar/n5/31.json";
import g_n5_32 from "../../data/grammar/n5/32.json";
import g_n5_33 from "../../data/grammar/n5/33.json";
import g_n5_34 from "../../data/grammar/n5/34.json";
import g_n5_35 from "../../data/grammar/n5/35.json";
import g_n5_36 from "../../data/grammar/n5/36.json";
import g_n5_37 from "../../data/grammar/n5/37.json";
import g_n5_38 from "../../data/grammar/n5/38.json";
import g_n5_39 from "../../data/grammar/n5/39.json";
import g_n5_40 from "../../data/grammar/n5/40.json";
import g_n5_41 from "../../data/grammar/n5/41.json";
import g_n5_42 from "../../data/grammar/n5/42.json";
import g_n5_43 from "../../data/grammar/n5/43.json";
import g_n5_44 from "../../data/grammar/n5/44.json";
import g_n5_45 from "../../data/grammar/n5/45.json";
import g_n5_46 from "../../data/grammar/n5/46.json";
import g_n5_47 from "../../data/grammar/n5/47.json";
import g_n5_48 from "../../data/grammar/n5/48.json";
import g_n5_49 from "../../data/grammar/n5/49.json";
import g_n5_50 from "../../data/grammar/n5/50.json";
import g_n4_01 from "../../data/grammar/n4/01.json";
import g_n4_02 from "../../data/grammar/n4/02.json";
import g_n4_03 from "../../data/grammar/n4/03.json";
import g_n4_04 from "../../data/grammar/n4/04.json";
import g_n4_05 from "../../data/grammar/n4/05.json";
import g_n4_06 from "../../data/grammar/n4/06.json";
import g_n4_07 from "../../data/grammar/n4/07.json";
import g_n4_08 from "../../data/grammar/n4/08.json";
import g_n4_09 from "../../data/grammar/n4/09.json";
import g_n4_10 from "../../data/grammar/n4/10.json";
import g_n4_11 from "../../data/grammar/n4/11.json";
import g_n4_12 from "../../data/grammar/n4/12.json";
import g_n4_13 from "../../data/grammar/n4/13.json";
import g_n4_14 from "../../data/grammar/n4/14.json";
import g_n4_15 from "../../data/grammar/n4/15.json";
import g_n4_16 from "../../data/grammar/n4/16.json";
import g_n4_17 from "../../data/grammar/n4/17.json";
import g_n4_18 from "../../data/grammar/n4/18.json";
import g_n4_19 from "../../data/grammar/n4/19.json";
import g_n4_20 from "../../data/grammar/n4/20.json";
import g_n4_21 from "../../data/grammar/n4/21.json";
import g_n4_22 from "../../data/grammar/n4/22.json";
import g_n4_23 from "../../data/grammar/n4/23.json";
import g_n4_24 from "../../data/grammar/n4/24.json";
import g_n4_25 from "../../data/grammar/n4/25.json";
import g_n4_26 from "../../data/grammar/n4/26.json";
import g_n4_27 from "../../data/grammar/n4/27.json";
import g_n4_28 from "../../data/grammar/n4/28.json";
import g_n4_29 from "../../data/grammar/n4/29.json";
import g_n4_30 from "../../data/grammar/n4/30.json";
import g_n4_31 from "../../data/grammar/n4/31.json";
import g_n4_32 from "../../data/grammar/n4/32.json";
import g_n4_33 from "../../data/grammar/n4/33.json";
import g_n4_34 from "../../data/grammar/n4/34.json";
import g_n4_35 from "../../data/grammar/n4/35.json";
import g_n4_36 from "../../data/grammar/n4/36.json";
import g_n4_37 from "../../data/grammar/n4/37.json";
import g_n4_38 from "../../data/grammar/n4/38.json";
import g_n4_39 from "../../data/grammar/n4/39.json";
import g_n4_40 from "../../data/grammar/n4/40.json";
import g_n4_41 from "../../data/grammar/n4/41.json";
import g_n4_42 from "../../data/grammar/n4/42.json";
import g_n4_43 from "../../data/grammar/n4/43.json";
import g_n4_44 from "../../data/grammar/n4/44.json";
import g_n4_45 from "../../data/grammar/n4/45.json";
import g_n4_46 from "../../data/grammar/n4/46.json";
import g_n4_47 from "../../data/grammar/n4/47.json";
import g_n4_48 from "../../data/grammar/n4/48.json";
import g_n4_49 from "../../data/grammar/n4/49.json";
import g_n4_50 from "../../data/grammar/n4/50.json";
import g_n4_51 from "../../data/grammar/n4/51.json";
import g_n4_52 from "../../data/grammar/n4/52.json";
import g_n4_53 from "../../data/grammar/n4/53.json";
import g_n3_01 from "../../data/grammar/n3/01.json";
import g_n3_02 from "../../data/grammar/n3/02.json";
import g_n3_03 from "../../data/grammar/n3/03.json";
import g_n3_04 from "../../data/grammar/n3/04.json";
import g_n3_05 from "../../data/grammar/n3/05.json";
import g_n3_06 from "../../data/grammar/n3/06.json";
import g_n3_07 from "../../data/grammar/n3/07.json";
import g_n3_08 from "../../data/grammar/n3/08.json";
import g_n3_09 from "../../data/grammar/n3/09.json";
import g_n3_10 from "../../data/grammar/n3/10.json";
import g_n3_11 from "../../data/grammar/n3/11.json";
import g_n3_12 from "../../data/grammar/n3/12.json";
import g_n3_13 from "../../data/grammar/n3/13.json";
import g_n3_14 from "../../data/grammar/n3/14.json";
import g_n3_15 from "../../data/grammar/n3/15.json";
import g_n3_16 from "../../data/grammar/n3/16.json";
import g_n3_17 from "../../data/grammar/n3/17.json";
import g_n3_18 from "../../data/grammar/n3/18.json";
import g_n3_19 from "../../data/grammar/n3/19.json";
import g_n3_20 from "../../data/grammar/n3/20.json";
import g_n3_21 from "../../data/grammar/n3/21.json";
import g_n3_22 from "../../data/grammar/n3/22.json";
import g_n3_23 from "../../data/grammar/n3/23.json";
import g_n3_24 from "../../data/grammar/n3/24.json";
import g_n3_25 from "../../data/grammar/n3/25.json";
import g_n3_26 from "../../data/grammar/n3/26.json";
import g_n3_27 from "../../data/grammar/n3/27.json";
import g_n3_28 from "../../data/grammar/n3/28.json";
import g_n3_29 from "../../data/grammar/n3/29.json";
import g_n3_30 from "../../data/grammar/n3/30.json";
import g_n3_31 from "../../data/grammar/n3/31.json";
import g_n3_32 from "../../data/grammar/n3/32.json";
import g_n3_33 from "../../data/grammar/n3/33.json";
import g_n3_34 from "../../data/grammar/n3/34.json";
import g_n3_35 from "../../data/grammar/n3/35.json";
import g_n3_36 from "../../data/grammar/n3/36.json";
import g_n3_37 from "../../data/grammar/n3/37.json";
import g_n3_38 from "../../data/grammar/n3/38.json";
import g_n3_39 from "../../data/grammar/n3/39.json";
import g_n3_40 from "../../data/grammar/n3/40.json";
import g_n3_41 from "../../data/grammar/n3/41.json";
import g_n3_42 from "../../data/grammar/n3/42.json";
import g_n3_43 from "../../data/grammar/n3/43.json";
import g_n3_44 from "../../data/grammar/n3/44.json";
import g_n3_45 from "../../data/grammar/n3/45.json";
import g_n3_46 from "../../data/grammar/n3/46.json";
import g_n3_47 from "../../data/grammar/n3/47.json";
import g_n3_48 from "../../data/grammar/n3/48.json";
import g_n3_49 from "../../data/grammar/n3/49.json";
import g_n3_50 from "../../data/grammar/n3/50.json";
import g_n3_51 from "../../data/grammar/n3/51.json";
import g_n3_52 from "../../data/grammar/n3/52.json";
import g_n3_53 from "../../data/grammar/n3/53.json";
import g_n3_54 from "../../data/grammar/n3/54.json";
import g_n3_55 from "../../data/grammar/n3/55.json";
import g_n3_56 from "../../data/grammar/n3/56.json";
import g_n3_57 from "../../data/grammar/n3/57.json";
import g_n3_58 from "../../data/grammar/n3/58.json";
import g_n3_59 from "../../data/grammar/n3/59.json";
import g_n3_60 from "../../data/grammar/n3/60.json";
import g_n3_61 from "../../data/grammar/n3/61.json";
import g_n3_62 from "../../data/grammar/n3/62.json";
import g_n3_63 from "../../data/grammar/n3/63.json";
import g_n3_64 from "../../data/grammar/n3/64.json";
import g_n3_65 from "../../data/grammar/n3/65.json";
import g_n3_66 from "../../data/grammar/n3/66.json";
import g_n3_67 from "../../data/grammar/n3/67.json";
import g_n3_68 from "../../data/grammar/n3/68.json";
import g_n3_69 from "../../data/grammar/n3/69.json";
import g_n3_70 from "../../data/grammar/n3/70.json";
import g_n3_71 from "../../data/grammar/n3/71.json";
import g_n3_72 from "../../data/grammar/n3/72.json";
import g_n3_73 from "../../data/grammar/n3/73.json";
import g_n3_74 from "../../data/grammar/n3/74.json";
import g_n3_75 from "../../data/grammar/n3/75.json";
import g_n3_76 from "../../data/grammar/n3/76.json";
import g_n3_77 from "../../data/grammar/n3/77.json";
import g_n3_78 from "../../data/grammar/n3/78.json";
import g_n3_79 from "../../data/grammar/n3/79.json";
import g_n3_80 from "../../data/grammar/n3/80.json";
import g_n3_81 from "../../data/grammar/n3/81.json";
import g_n3_82 from "../../data/grammar/n3/82.json";
import g_n3_83 from "../../data/grammar/n3/83.json";
import g_n3_84 from "../../data/grammar/n3/84.json";
import g_n3_85 from "../../data/grammar/n3/85.json";
import g_n3_86 from "../../data/grammar/n3/86.json";
import g_n3_87 from "../../data/grammar/n3/87.json";
import g_n3_88 from "../../data/grammar/n3/88.json";
import g_n3_89 from "../../data/grammar/n3/89.json";
import g_n3_90 from "../../data/grammar/n3/90.json";
import g_n3_91 from "../../data/grammar/n3/91.json";
import g_n3_92 from "../../data/grammar/n3/92.json";
import g_n3_93 from "../../data/grammar/n3/93.json";
import g_n3_94 from "../../data/grammar/n3/94.json";
import g_n3_95 from "../../data/grammar/n3/95.json";
import g_n3_96 from "../../data/grammar/n3/96.json";
import g_n3_97 from "../../data/grammar/n3/97.json";
import g_n3_98 from "../../data/grammar/n3/98.json";
import g_n3_99 from "../../data/grammar/n3/99.json";
import g_n3_100 from "../../data/grammar/n3/100.json";
import g_n3_101 from "../../data/grammar/n3/101.json";
import g_n3_102 from "../../data/grammar/n3/102.json";
import g_n3_103 from "../../data/grammar/n3/103.json";
import g_n3_104 from "../../data/grammar/n3/104.json";
import g_n3_105 from "../../data/grammar/n3/105.json";
import g_n3_106 from "../../data/grammar/n3/106.json";
import g_n3_107 from "../../data/grammar/n3/107.json";
import g_n3_108 from "../../data/grammar/n3/108.json";
import g_n3_109 from "../../data/grammar/n3/109.json";
import g_n3_110 from "../../data/grammar/n3/110.json";
import g_n3_111 from "../../data/grammar/n3/111.json";
import g_n3_112 from "../../data/grammar/n3/112.json";
import g_n3_113 from "../../data/grammar/n3/113.json";
import g_n3_114 from "../../data/grammar/n3/114.json";
import g_n3_115 from "../../data/grammar/n3/115.json";
import g_n3_116 from "../../data/grammar/n3/116.json";
import g_n3_117 from "../../data/grammar/n3/117.json";
import g_n3_118 from "../../data/grammar/n3/118.json";
import g_n3_119 from "../../data/grammar/n3/119.json";
import g_n3_120 from "../../data/grammar/n3/120.json";
import g_n3_121 from "../../data/grammar/n3/121.json";
import g_n3_122 from "../../data/grammar/n3/122.json";
import g_n3_123 from "../../data/grammar/n3/123.json";
import g_n3_124 from "../../data/grammar/n3/124.json";
import g_n3_125 from "../../data/grammar/n3/125.json";
import g_n3_126 from "../../data/grammar/n3/126.json";
import g_n3_127 from "../../data/grammar/n3/127.json";
import g_n3_128 from "../../data/grammar/n3/128.json";
import g_n3_129 from "../../data/grammar/n3/129.json";
import g_n3_130 from "../../data/grammar/n3/130.json";
import g_n3_131 from "../../data/grammar/n3/131.json";
import g_n3_132 from "../../data/grammar/n3/132.json";
import g_n3_133 from "../../data/grammar/n3/133.json";
import g_n3_134 from "../../data/grammar/n3/134.json";
import g_n3_135 from "../../data/grammar/n3/135.json";
import g_n3_136 from "../../data/grammar/n3/136.json";
import g_n3_137 from "../../data/grammar/n3/137.json";
import g_n3_138 from "../../data/grammar/n3/138.json";
import g_n3_139 from "../../data/grammar/n3/139.json";
import g_n3_140 from "../../data/grammar/n3/140.json";
import g_n2_01 from "../../data/grammar/n2/01.json";
import g_n2_02 from "../../data/grammar/n2/02.json";
import g_n2_03 from "../../data/grammar/n2/03.json";
import g_n2_04 from "../../data/grammar/n2/04.json";
import g_n2_05 from "../../data/grammar/n2/05.json";
import g_n2_06 from "../../data/grammar/n2/06.json";
import g_n2_07 from "../../data/grammar/n2/07.json";
import g_n2_08 from "../../data/grammar/n2/08.json";
import g_n2_09 from "../../data/grammar/n2/09.json";
import g_n2_10 from "../../data/grammar/n2/10.json";

export const grammarLessonsByLevel: Record<LevelId, GrammarLesson[]> = {
  N5: [
    g_n5_00 as GrammarLesson,
    g_n5_01 as GrammarLesson,
    g_n5_02 as GrammarLesson,
    g_n5_03 as GrammarLesson,
    g_n5_04 as GrammarLesson,
    g_n5_05 as GrammarLesson,
    g_n5_06 as GrammarLesson,
    g_n5_07 as GrammarLesson,
    g_n5_08 as GrammarLesson,
    g_n5_09 as GrammarLesson,
    g_n5_10 as GrammarLesson,
    g_n5_11 as GrammarLesson,
    g_n5_12 as GrammarLesson,
    g_n5_13 as GrammarLesson,
    g_n5_14 as GrammarLesson,
    g_n5_15 as GrammarLesson,
    g_n5_16 as GrammarLesson,
    g_n5_17 as GrammarLesson,
    g_n5_18 as GrammarLesson,
    g_n5_19 as GrammarLesson,
    g_n5_20 as GrammarLesson,
    g_n5_21 as GrammarLesson,
    g_n5_22 as GrammarLesson,
    g_n5_23 as GrammarLesson,
    g_n5_24 as GrammarLesson,
    g_n5_25 as GrammarLesson,
    g_n5_26 as GrammarLesson,
    g_n5_27 as GrammarLesson,
    g_n5_28 as GrammarLesson,
    g_n5_29 as GrammarLesson,
    g_n5_30 as GrammarLesson,
    g_n5_31 as GrammarLesson,
    g_n5_32 as GrammarLesson,
    g_n5_33 as GrammarLesson,
    g_n5_34 as GrammarLesson,
    g_n5_35 as GrammarLesson,
    g_n5_36 as GrammarLesson,
    g_n5_37 as GrammarLesson,
    g_n5_38 as GrammarLesson,
    g_n5_39 as GrammarLesson,
    g_n5_40 as GrammarLesson,
    g_n5_41 as GrammarLesson,
    g_n5_42 as GrammarLesson,
    g_n5_43 as GrammarLesson,
    g_n5_44 as GrammarLesson,
    g_n5_45 as GrammarLesson,
    g_n5_46 as GrammarLesson,
    g_n5_47 as GrammarLesson,
    g_n5_48 as GrammarLesson,
    g_n5_49 as GrammarLesson,
    g_n5_50 as GrammarLesson,
  ],
  N4: [
    g_n4_01 as GrammarLesson,
    g_n4_02 as GrammarLesson,
    g_n4_03 as GrammarLesson,
    g_n4_04 as GrammarLesson,
    g_n4_05 as GrammarLesson,
    g_n4_06 as GrammarLesson,
    g_n4_07 as GrammarLesson,
    g_n4_08 as GrammarLesson,
    g_n4_09 as GrammarLesson,
    g_n4_10 as GrammarLesson,
    g_n4_11 as GrammarLesson,
    g_n4_12 as GrammarLesson,
    g_n4_13 as GrammarLesson,
    g_n4_14 as GrammarLesson,
    g_n4_15 as GrammarLesson,
    g_n4_16 as GrammarLesson,
    g_n4_17 as GrammarLesson,
    g_n4_18 as GrammarLesson,
    g_n4_19 as GrammarLesson,
    g_n4_20 as GrammarLesson,
    g_n4_21 as GrammarLesson,
    g_n4_22 as GrammarLesson,
    g_n4_23 as GrammarLesson,
    g_n4_24 as GrammarLesson,
    g_n4_25 as GrammarLesson,
    g_n4_26 as GrammarLesson,
    g_n4_27 as GrammarLesson,
    g_n4_28 as GrammarLesson,
    g_n4_29 as GrammarLesson,
    g_n4_30 as GrammarLesson,
    g_n4_31 as GrammarLesson,
    g_n4_32 as GrammarLesson,
    g_n4_33 as GrammarLesson,
    g_n4_34 as GrammarLesson,
    g_n4_35 as GrammarLesson,
    g_n4_36 as GrammarLesson,
    g_n4_37 as GrammarLesson,
    g_n4_38 as GrammarLesson,
    g_n4_39 as GrammarLesson,
    g_n4_40 as GrammarLesson,
    g_n4_41 as GrammarLesson,
    g_n4_42 as GrammarLesson,
    g_n4_43 as GrammarLesson,
    g_n4_44 as GrammarLesson,
    g_n4_45 as GrammarLesson,
    g_n4_46 as GrammarLesson,
    g_n4_47 as GrammarLesson,
    g_n4_48 as GrammarLesson,
    g_n4_49 as GrammarLesson,
    g_n4_50 as GrammarLesson,
    g_n4_51 as GrammarLesson,
    g_n4_52 as GrammarLesson,
    g_n4_53 as GrammarLesson,
  ],
  N3: [
    g_n3_01 as GrammarLesson,
    g_n3_02 as GrammarLesson,
    g_n3_03 as GrammarLesson,
    g_n3_04 as GrammarLesson,
    g_n3_05 as GrammarLesson,
    g_n3_06 as GrammarLesson,
    g_n3_07 as GrammarLesson,
    g_n3_08 as GrammarLesson,
    g_n3_09 as GrammarLesson,
    g_n3_10 as GrammarLesson,
    g_n3_11 as GrammarLesson,
    g_n3_12 as GrammarLesson,
    g_n3_13 as GrammarLesson,
    g_n3_14 as GrammarLesson,
    g_n3_15 as GrammarLesson,
    g_n3_16 as GrammarLesson,
    g_n3_17 as GrammarLesson,
    g_n3_18 as GrammarLesson,
    g_n3_19 as GrammarLesson,
    g_n3_20 as GrammarLesson,
    g_n3_21 as GrammarLesson,
    g_n3_22 as GrammarLesson,
    g_n3_23 as GrammarLesson,
    g_n3_24 as GrammarLesson,
    g_n3_25 as GrammarLesson,
    g_n3_26 as GrammarLesson,
    g_n3_27 as GrammarLesson,
    g_n3_28 as GrammarLesson,
    g_n3_29 as GrammarLesson,
    g_n3_30 as GrammarLesson,
    g_n3_31 as GrammarLesson,
    g_n3_32 as GrammarLesson,
    g_n3_33 as GrammarLesson,
    g_n3_34 as GrammarLesson,
    g_n3_35 as GrammarLesson,
    g_n3_36 as GrammarLesson,
    g_n3_37 as GrammarLesson,
    g_n3_38 as GrammarLesson,
    g_n3_39 as GrammarLesson,
    g_n3_40 as GrammarLesson,
    g_n3_41 as GrammarLesson,
    g_n3_42 as GrammarLesson,
    g_n3_43 as GrammarLesson,
    g_n3_44 as GrammarLesson,
    g_n3_45 as GrammarLesson,
    g_n3_46 as GrammarLesson,
    g_n3_47 as GrammarLesson,
    g_n3_48 as GrammarLesson,
    g_n3_49 as GrammarLesson,
    g_n3_50 as GrammarLesson,
    g_n3_51 as GrammarLesson,
    g_n3_52 as GrammarLesson,
    g_n3_53 as GrammarLesson,
    g_n3_54 as GrammarLesson,
    g_n3_55 as GrammarLesson,
    g_n3_56 as GrammarLesson,
    g_n3_57 as GrammarLesson,
    g_n3_58 as GrammarLesson,
    g_n3_59 as GrammarLesson,
    g_n3_60 as GrammarLesson,
    g_n3_61 as GrammarLesson,
    g_n3_62 as GrammarLesson,
    g_n3_63 as GrammarLesson,
    g_n3_64 as GrammarLesson,
    g_n3_65 as GrammarLesson,
    g_n3_66 as GrammarLesson,
    g_n3_67 as GrammarLesson,
    g_n3_68 as GrammarLesson,
    g_n3_69 as GrammarLesson,
    g_n3_70 as GrammarLesson,
    g_n3_71 as GrammarLesson,
    g_n3_72 as GrammarLesson,
    g_n3_73 as GrammarLesson,
    g_n3_74 as GrammarLesson,
    g_n3_75 as GrammarLesson,
    g_n3_76 as GrammarLesson,
    g_n3_77 as GrammarLesson,
    g_n3_78 as GrammarLesson,
    g_n3_79 as GrammarLesson,
    g_n3_80 as GrammarLesson,
    g_n3_81 as GrammarLesson,
    g_n3_82 as GrammarLesson,
    g_n3_83 as GrammarLesson,
    g_n3_84 as GrammarLesson,
    g_n3_85 as GrammarLesson,
    g_n3_86 as GrammarLesson,
    g_n3_87 as GrammarLesson,
    g_n3_88 as GrammarLesson,
    g_n3_89 as GrammarLesson,
    g_n3_90 as GrammarLesson,
    g_n3_91 as GrammarLesson,
    g_n3_92 as GrammarLesson,
    g_n3_93 as GrammarLesson,
    g_n3_94 as GrammarLesson,
    g_n3_95 as GrammarLesson,
    g_n3_96 as GrammarLesson,
    g_n3_97 as GrammarLesson,
    g_n3_98 as GrammarLesson,
    g_n3_99 as GrammarLesson,
    g_n3_100 as GrammarLesson,
    g_n3_101 as GrammarLesson,
    g_n3_102 as GrammarLesson,
    g_n3_103 as GrammarLesson,
    g_n3_104 as GrammarLesson,
    g_n3_105 as GrammarLesson,
    g_n3_106 as GrammarLesson,
    g_n3_107 as GrammarLesson,
    g_n3_108 as GrammarLesson,
    g_n3_109 as GrammarLesson,
    g_n3_110 as GrammarLesson,
    g_n3_111 as GrammarLesson,
    g_n3_112 as GrammarLesson,
    g_n3_113 as GrammarLesson,
    g_n3_114 as GrammarLesson,
    g_n3_115 as GrammarLesson,
    g_n3_116 as GrammarLesson,
    g_n3_117 as GrammarLesson,
    g_n3_118 as GrammarLesson,
    g_n3_119 as GrammarLesson,
    g_n3_120 as GrammarLesson,
    g_n3_121 as GrammarLesson,
    g_n3_122 as GrammarLesson,
    g_n3_123 as GrammarLesson,
    g_n3_124 as GrammarLesson,
    g_n3_125 as GrammarLesson,
    g_n3_126 as GrammarLesson,
    g_n3_127 as GrammarLesson,
    g_n3_128 as GrammarLesson,
    g_n3_129 as GrammarLesson,
    g_n3_130 as GrammarLesson,
    g_n3_131 as GrammarLesson,
    g_n3_132 as GrammarLesson,
    g_n3_133 as GrammarLesson,
    g_n3_134 as GrammarLesson,
    g_n3_135 as GrammarLesson,
    g_n3_136 as GrammarLesson,
    g_n3_137 as GrammarLesson,
    g_n3_138 as GrammarLesson,
    g_n3_139 as GrammarLesson,
    g_n3_140 as GrammarLesson,
  ],
  N2: [
    g_n2_01 as GrammarLesson,
    g_n2_02 as GrammarLesson,
    g_n2_03 as GrammarLesson,
    g_n2_04 as GrammarLesson,
    g_n2_05 as GrammarLesson,
    g_n2_06 as GrammarLesson,
    g_n2_07 as GrammarLesson,
    g_n2_08 as GrammarLesson,
    g_n2_09 as GrammarLesson,
    g_n2_10 as GrammarLesson,
  ],
  N1: [

  ],
};

export const ALL_GRAMMAR_LESSONS: GrammarLesson[] = [
  ...grammarLessonsByLevel.N5,
  ...grammarLessonsByLevel.N4,
  ...grammarLessonsByLevel.N3,
  ...grammarLessonsByLevel.N2,
  ...grammarLessonsByLevel.N1,
];

export function grammarLessonKey(level: LevelId, id: string) {
  return `${level}:${id}`;
}

export function findGrammarLesson(level: LevelId, id: string): GrammarLesson | undefined {
  return grammarLessonsByLevel[level].find((item) => item.id === id);
}
