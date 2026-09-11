# Spec — tip-refresh-post-114

## EARS
CUANDO el sistema ejecuta verify:strict, EL SISTEMA valida que main_tip coincide exactamente con 582adbd2f8d6dc9d17e2821098e8991756bc7979.

CUANDO se ejecuta `npm run test:m4`, EL SISTEMA confirma EXPECTED_TIP = 582adbd2f8d6dc9d17e2821098e8991756bc7979 frente a freeze y matrix.

CUANDO se ejecuta `npm run test:t8`, EL SISTEMA confirma tip honesty del dirty-defer lock contra el mismo SHA.

## BDD
```gherkin
Scenario: Tip honesty after Mission E #114
  Given origin/main tip is 582adbd2f8d6dc9d17e2821098e8991756bc7979
  When operators refresh freeze/matrix/m4/dirty-defer pins
  Then verify:strict passes with 0 failures
  And PRODUCTION_READY remains NO
  And Fundacion Delta remains 0
```
