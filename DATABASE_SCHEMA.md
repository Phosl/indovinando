## Table `game_bottle_answers`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `uuid`        | Primary     |
| `bottle_id`   | `uuid`        |             |
| `question_id` | `uuid`        |             |
| `option_id`   | `uuid`        |             |
| `created_at`  | `timestamptz` | Nullable    |

## Table `game_bottles`

### Columns

| Name           | Type          | Constraints |
| -------------- | ------------- | ----------- |
| `id`           | `uuid`        | Primary     |
| `game_id`      | `uuid`        |             |
| `name`         | `varchar`     |             |
| `producer`     | `varchar`     | Nullable    |
| `year`         | `varchar`     | Nullable    |
| `bottle_order` | `int4`        |             |
| `created_at`   | `timestamptz` | Nullable    |

## Table `game_question_options`

### Columns

| Name           | Type          | Constraints |
| -------------- | ------------- | ----------- |
| `id`           | `uuid`        | Primary     |
| `question_id`  | `uuid`        |             |
| `text`         | `varchar`     |             |
| `option_order` | `int4`        |             |
| `created_at`   | `timestamptz` | Nullable    |

## Table `game_questions`

### Columns

| Name            | Type          | Constraints |
| --------------- | ------------- | ----------- |
| `id`            | `uuid`        | Primary     |
| `game_id`       | `uuid`        |             |
| `text`          | `text`        |             |
| `display_order` | `int4`        |             |
| `created_at`    | `timestamptz` | Nullable    |

## Table `games`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `uuid`        | Primary     |
| `created_by` | `uuid`        |             |
| `name`       | `varchar`     |             |
| `status`     | `varchar`     | Nullable    |
| `created_at` | `timestamptz` | Nullable    |
| `updated_at` | `timestamptz` | Nullable    |

## Table `live_players`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `uuid`        | Primary     |
| `session_id`  | `uuid`        |             |
| `nickname`    | `text`        |             |
| `avatar_id`   | `int4`        |             |
| `user_id`     | `uuid`        | Nullable    |
| `joined_at`   | `timestamptz` | Nullable    |
| `is_host`     | `bool`        | Nullable    |
| `total_score` | `int4`        | Nullable    |
| `created_at`  | `timestamptz` | Nullable    |
| `updated_at`  | `timestamptz` | Nullable    |

## Table `live_round_answers`

### Columns

| Name                 | Type          | Constraints |
| -------------------- | ------------- | ----------- |
| `id`                 | `uuid`        | Primary     |
| `session_id`         | `uuid`        |             |
| `player_id`          | `uuid`        |             |
| `question_id`        | `uuid`        |             |
| `selected_option_id` | `uuid`        |             |
| `is_correct`         | `bool`        | Nullable    |
| `points`             | `int4`        | Nullable    |
| `answered_at`        | `timestamptz` | Nullable    |
| `created_at`         | `timestamptz` | Nullable    |

## Table `live_round_status`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `uuid`        | Primary     |
| `session_id`  | `uuid`        |             |
| `question_id` | `uuid`        |             |
| `status`      | `text`        |             |
| `created_at`  | `timestamptz` | Nullable    |
| `updated_at`  | `timestamptz` | Nullable    |

## Table `live_sessions`

### Columns

| Name                     | Type          | Constraints |
| ------------------------ | ------------- | ----------- |
| `id`                     | `uuid`        | Primary     |
| `game_id`                | `uuid`        |             |
| `host_user_id`           | `uuid`        |             |
| `status`                 | `text`        |             |
| `current_question_index` | `int4`        | Nullable    |
| `round_status`           | `text`        |             |
| `created_at`             | `timestamptz` | Nullable    |
| `started_at`             | `timestamptz` | Nullable    |
| `finished_at`            | `timestamptz` | Nullable    |
| `updated_at`             | `timestamptz` | Nullable    |

## Table `profiles`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `uuid`        | Primary     |
| `username`   | `text`        | Nullable    |
| `created_at` | `timestamptz` | Nullable    |
| `onboarding` | `bool`        | Nullable    |
