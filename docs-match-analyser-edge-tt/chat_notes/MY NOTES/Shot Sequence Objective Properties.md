
This is the objective sequence and properties:


ShotContext:
  - rallyShotNumber
  - playerId
  - isServe (derived)
  - isReceive (derived)

BallBefore:
  - spin
  - speed
  - trajectory
  - arrivalPosition

PlayerBefore:
  - position

PlayerShot:
  - wing
  - shotType
  - contactDepth
  - spinApplied
  - spinStrength

BallAfter:
  - direction
  - depth
  - result

PlayerAfter:
  - position

Outcome:
  - isRallyEnd
  - isWinner (derived)
  - isError (derived)



This is the subjective list
ShotIntent:
  - attack / control / defence / finish / variation

ShotQuality:
  - poor / average / good / excellent

ErrorClassification:
  - forced / unforced / semi-forced

IncomingDifficulty:
  - easy / neutral / difficult

RecoveryQuality:
  - poor / average / good


in sports analysis (especially tennis/racket sports), a **[winner shot](https://www.google.com/search?q=winner+shot&oq=in+sports+analysis+do+you+class+a+winner+shot+the+same+as+a+forced+error%3F&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCTE5ODcwajBqOagCBrACAfEFWT5DMAx9Iuc&sourceid=chrome&ie=UTF-8&mstk=AUtExfALMUuXL29ACaqF2JAk_gQk6gLiakwRgi93vl4Rb6qgwhXmzB68lZV0QqRtVsiAkHrqJC1ead0Lq_ITVLp1kYF_-LUKKjMpHdszm2UFGizV1lyFDlNJQnbLrL0zXILj2OlXJQ_LLYrm1uEUYef8CaG5EVthAnJ60TPrLu8oIc_R7Mv_ygPqdzXNbNRNMtdpTa28zBm2xdVXImI7cqaLJ_qk0iLNZoK6BMTTwq5N62hyLnCGqwLvBCRO9BArV_lL1BK4T7_482IJgwB5oeuP6pD0&csui=3&ved=2ahUKEwjG--7I0qmRAxXGoScCHaN_PbAQgK4QegQIARAB)** (direct point-winner) and a **[forced error](https://www.google.com/search?q=forced+error&oq=in+sports+analysis+do+you+class+a+winner+shot+the+same+as+a+forced+error%3F&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCTE5ODcwajBqOagCBrACAfEFWT5DMAx9Iuc&sourceid=chrome&ie=UTF-8&mstk=AUtExfALMUuXL29ACaqF2JAk_gQk6gLiakwRgi93vl4Rb6qgwhXmzB68lZV0QqRtVsiAkHrqJC1ead0Lq_ITVLp1kYF_-LUKKjMpHdszm2UFGizV1lyFDlNJQnbLrL0zXILj2OlXJQ_LLYrm1uEUYef8CaG5EVthAnJ60TPrLu8oIc_R7Mv_ygPqdzXNbNRNMtdpTa28zBm2xdVXImI7cqaLJ_qk0iLNZoK6BMTTwq5N62hyLnCGqwLvBCRO9BArV_lL1BK4T7_482IJgwB5oeuP6pD0&csui=3&ved=2ahUKEwjG--7I0qmRAxXGoScCHaN_PbAQgK4QegQIARAC)** (opponent makes error due to pressure) are distinct outcomes, but both stem from an **aggressive, skillful preceding shot**, with a winner being the _ultimate_ success (opponent can't touch) and a forced error being a _near-win_ where the opponent barely touches it but can't recover it.


