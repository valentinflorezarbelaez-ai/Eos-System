# Spec — PTG Instagram pipeline

Status of this document: specification. It does not certify a company, a person, or a statistic. `PRODUCTION_READY`: not claimed.

## Identity (USER_ASSERTED)

No file in this repository is the source for the following. Label: `USER_ASSERTED`. Do not relabel as `VERIFIED` until a source file is cited.

| Item | User-asserted value |
| --- | --- |
| Legal name | Performance Talent Group S.A.S. |
| NIT | 9019705444 |
| CEO | Andrés Isaza Olarte |
| FIFA Football Agent License | 202507-10582 |
| Connect ID | 1S50CQ6 |
| Authorization regarding minors | User asserts authorization since 13/07/2025. This is not permission to publish a minor’s personal data. |
| Sports-law degree | User asserts a master’s degree in Sports Law, ISDE Barcelona |
| Director of Scouting | Robhert Mena Cuesta |
| Coach registry | User asserts COCED Colombia registry TE 16703 |
| Tools named by the user | Wyscout and InStat |

## Roster figures (USER_ASSERTED)

Do not print these on the EOS public site. Do not treat them as measured by EOS. Do not attach them to a minor’s personal data.

| Person (as stated) | Figure (as stated) | Label |
| --- | --- | --- |
| Samuel Martínez Correa | 85% penalties saved | `USER_ASSERTED` |
| Samuel Quiceno Martínez | 32 goals in 23 matches | `USER_ASSERTED` |
| Darlinson Murillo Gamboa | 1.91 m | `USER_ASSERTED` |
| Emanuel Duque Torres | 89% pass accuracy | `USER_ASSERTED` |

If a person in this table is a minor, the figure stays in this spec as an operator assertion and is not cleared for Instagram, the website, or any caption.

## Media contract

Given an asset proposed for Instagram  
When it is video  
Then the contract is 9:16, 1080×1920, H.264, VBR, 2-pass, 15–20 Mbps, AAC 320 kbps, 48 kHz.

Given an asset proposed for Instagram  
When it is a still or a carousel frame  
Then the contract is 4:5, 1080×1350  
And 1:1 is rejected.

Given a caption  
When hashtags are counted  
Then the count is between 3 and 5 inclusive.

These bounds are requirements. This spec does not claim an encoder run or a measured file.

## Copy contract

Given a caption draft  
When it uses praise, ego, or ranking language without a cited source  
Then it is rejected.

Given a caption draft  
When it is accepted  
Then it is short and high density.

### Pattern Alpha — legal and financial

Given a caption about the company, a license, a registry, or a role  
When Pattern Alpha is selected  
Then the caption names the institution and the identifier  
And it does not add evaluative adjectives.

No token template for Alpha exists in the repository. Do not invent one.

### Pattern Beta — biomechanical and quantitative

Given a caption that includes a measurement  
When Pattern Beta is selected  
Then the number keeps its unit  
And the number is labeled `USER_ASSERTED` or cites a source file  
And the caption does not rank the athlete.

No token template for Beta exists in the repository. Do not invent one.

## Minors

Given any athlete who is a minor  
When a caption, alt text, carousel, or public page is prepared  
Then personal data (identity details beyond a gated internal spec, contact, school, home, guardian, or documents) is not published.

## Placement

Given the public EOS homepage  
When it is built from this change  
Then it does not include this pipeline.

Given the Control Plane kernel  
When this change is applied  
Then `src/core/` is unchanged.
