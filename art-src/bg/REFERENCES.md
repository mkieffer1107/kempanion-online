# Background reference photos

Some pixel-art backgrounds were painted by an image model using a real photo as a composition/architecture reference.
The photos come from Wikimedia Commons; their authors and licenses are listed below. Backgrounds derived from
CC BY-SA photos, their night variants (`*_night`), and the event CGs painted over those backgrounds (listed further
down) are adaptations licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The photo
licenses: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/),
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/),
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The baked images ship in `public/assets/bg/` and
`public/assets/cg/` and are displayed at https://kempanion.online.

| Background | Reference photo | Author | License |
|---|---|---|---|
| `malachowsky` | [Malachowsky Hall - University of Florida - Gainesville.jpg](https://commons.wikimedia.org/wiki/File:Malachowsky_Hall_-_University_of_Florida_-_Gainesville.jpg) | Pinofarese | CC BY-SA 4.0 |
| `physics` | [UF NewPhysicsBuilding.jpg](https://commons.wikimedia.org/wiki/File:UF_NewPhysicsBuilding.jpg) | WillMcC | CC BY-SA 3.0 |
| `communicore` | [UFCOM Entrance.png](https://commons.wikimedia.org/wiki/File:UFCOM_Entrance.png) | Daysaway | CC BY-SA 3.0 |
| `shands` | [UF Shands.jpg](https://commons.wikimedia.org/wiki/File:UF_Shands.jpg) | WillMcC | CC BY-SA 3.0 |
| `stadium` | [Ben Hill Griffin Stadium empty.jpg](https://commons.wikimedia.org/wiki/File:Ben_Hill_Griffin_Stadium_empty.jpg) | Hughs (en.wikipedia) | CC BY-SA 2.5 |
| `reitz` | [Reitz Union.jpg](https://commons.wikimedia.org/wiki/File:Reitz_Union.jpg) | Reitz Union | CC BY-SA 4.0 |
| `plaza` | [UF PlazaOfTheAmericas.jpg](https://commons.wikimedia.org/wiki/File:UF_PlazaOfTheAmericas.jpg) | William M | CC BY-SA 3.0 |
| `marston` | [UF-MarstonScienceLibrary.jpg](https://commons.wikimedia.org/wiki/File:UF-MarstonScienceLibrary.jpg) | Porsche997SBS | CC0 |

`or_suite` and `home_p2` were painted from photos provided by the project owner (people and text removed).
All other backgrounds (`dorm`, `home_p1`, `home_p3`, `century_tower`, `lake_alice`, `volleyball_courts`, `midtown`,
`anatomy_lab`, `physics_lab`, `sakura_house`, `legend_sakura`, `title`, `map`) were generated from text prompts only.
Prompts live in `art-src/bg/prompts/`. Raw generations are kept out of git (`art-src/raw/`).

## Event CGs painted over these backgrounds

These CGs used one of the backgrounds above as their location reference, so they are CC BY-SA 4.0 adaptations as well
(same attribution as their background):

| CG | Background |
|---|---|
| `cg_p1_petal_dive`, `cg_p1_yours`, `cg_trio_lunch_on_the_lawn` | `plaza` |
| `cg_p1_whiteboard` | `malachowsky` |
| `cg_p2_poor_willis`, `cg_p2_light_box` (night), `cg_p2_he_walks` | `communicore` |
| `cg_p2_follow_the_hoof`, `cg_p3_name_badge`, `cg_p3_demo_day`, `cg_trio_see_you_next_semester` | `reitz` |
| `cg_trio_swamp_sway` | `stadium` |

`cg_p2_discharge_summary` and `cg_trio_marston_sunrise` use the `marston` background (CC0 photo); no conditions apply.
