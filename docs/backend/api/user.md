# User preferences and avatar

Unless noted, success body is `{ "data": … }` and the tables describe the **payload inside `data`**.

## User preferences and avatar

### `GET /api/users/preferences`

- **Auth:** session  
- **Response:** [`UserPreferenceDto`](./dtos.md#userpreferencedto)

### `PUT /api/users/preferences`

- **Auth:** session  
- **Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `plannerSidebarWidth` | number | 0…100 |
| `plannerSidebarCollapsed` | boolean | |

- **Response:** [`UserPreferenceDto`](./dtos.md#userpreferencedto)

### `PUT /api/users/preferences/agent-panel`

- **Auth:** session  
- **Body:** `{ collapsed: boolean }`  
- **Response:** [`UserPreferenceDto`](./dtos.md#userpreferencedto)

### `POST /api/users/avatar`

- **Auth:** session  
- **Status:** `201`  
- **Body:** `multipart/form-data`, field name **`avatar`**  
- **Constraints:** PNG / JPEG / WebP; max **2 MiB**  
- **Response:** `{ url: string }`  
- **Errors:** `400` `avatar_missing` / `avatar_unsupported_mime`; `413`
  `avatar_too_large`

### `DELETE /api/users/avatar`

- **Auth:** session  
- **Response:** `{ image: null }`

---

[← API index](./README.md) · [Route index](./routes.md) · [DTOs](./dtos.md)
