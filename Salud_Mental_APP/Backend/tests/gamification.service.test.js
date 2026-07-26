import { describe, expect, jest, test } from "@jest/globals";
import { applyGamificationEvent } from "../src/services/gamification.service.js";

describe("Servicio de gamificación", () => {
  test("debe otorgar 10 puntos al registrar una emoción", async () => {
    const db = {
      query: jest
        .fn()

        // Crea el progreso si todavía no existe.
        .mockResolvedValueOnce({
          rows: []
        })

        // Devuelve el progreso actualizado.
        .mockResolvedValueOnce({
          rows: [
            {
              points: 10,
              level: 1,
              activities_completed: 0,
              streak_days: 1,
              last_activity_date: "2026-07-23",
              updated_at: "2026-07-23"
            }
          ]
        })

        // Cantidad de emociones del usuario.
        .mockResolvedValueOnce({
          rows: [
            {
              total: 1
            }
          ]
        })

        // Logros activos.
        .mockResolvedValueOnce({
          rows: []
        })
    };

    const result = await applyGamificationEvent(db, {
      userId: 1,
      eventType: "EMOTION_REGISTERED"
    });

    expect(result.points_added).toBe(10);
    expect(result.progress.points).toBe(10);
    expect(result.progress.activities_completed).toBe(0);
    expect(db.query).toHaveBeenCalledTimes(4);
  });

  test("debe otorgar 20 puntos y aumentar una actividad completada", async () => {
    const db = {
      query: jest
        .fn()

        .mockResolvedValueOnce({
          rows: []
        })

        .mockResolvedValueOnce({
          rows: [
            {
              points: 30,
              level: 1,
              activities_completed: 1,
              streak_days: 1,
              last_activity_date: "2026-07-23",
              updated_at: "2026-07-23"
            }
          ]
        })

        .mockResolvedValueOnce({
          rows: [
            {
              total: 1
            }
          ]
        })

        .mockResolvedValueOnce({
          rows: []
        })
    };

    const result = await applyGamificationEvent(db, {
      userId: 1,
      eventType: "ACTIVITY_COMPLETED"
    });

    expect(result.points_added).toBe(20);
    expect(result.progress.points).toBe(30);
    expect(result.progress.activities_completed).toBe(1);
    expect(db.query).toHaveBeenCalledTimes(4);
  });

  test("no debe otorgar puntos cuando awardPoints es false", async () => {
    const db = {
      query: jest
        .fn()

        .mockResolvedValueOnce({
          rows: []
        })

        .mockResolvedValueOnce({
          rows: [
            {
              points: 10,
              level: 1,
              activities_completed: 0,
              streak_days: 1,
              last_activity_date: "2026-07-23",
              updated_at: "2026-07-23"
            }
          ]
        })

        .mockResolvedValueOnce({
          rows: [
            {
              total: 1
            }
          ]
        })

        .mockResolvedValueOnce({
          rows: []
        })
    };

    const result = await applyGamificationEvent(db, {
      userId: 1,
      eventType: "ACTIVITY_COMPLETED",
      awardPoints: false
    });

    expect(result.points_added).toBe(0);

    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      [0, 0, 1]
    );
  });

  test("debe rechazar un tipo de evento no válido", async () => {
    const db = {
      query: jest.fn()
    };

    await expect(
      applyGamificationEvent(db, {
        userId: 1,
        eventType: "EVENTO_INEXISTENTE"
      })
    ).rejects.toThrow(
      "Tipo de evento de gamificación no válido"
    );

    expect(db.query).not.toHaveBeenCalled();
  });

  test("debe desbloquear un logro cuando se cumple el criterio", async () => {
    const db = {
      query: jest
        .fn()

        // Creación inicial del progreso.
        .mockResolvedValueOnce({
          rows: []
        })

        // Progreso actualizado.
        .mockResolvedValueOnce({
          rows: [
            {
              points: 10,
              level: 1,
              activities_completed: 0,
              streak_days: 1,
              last_activity_date: "2026-07-23",
              updated_at: "2026-07-23"
            }
          ]
        })

        // El usuario ya tiene una emoción.
        .mockResolvedValueOnce({
          rows: [
            {
              total: 1
            }
          ]
        })

        // Logro de primera emoción.
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: "FIRST_EMOTION",
              criterion_type: "emotion_count",
              criterion_value: 1,
              points_required: 0
            }
          ]
        })

        // Inserción en user_achievements.
        .mockResolvedValueOnce({
          rows: []
        })
    };

    await applyGamificationEvent(db, {
      userId: 1,
      eventType: "EMOTION_REGISTERED"
    });

    expect(db.query).toHaveBeenCalledTimes(5);

    expect(db.query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining(
        "INSERT INTO user_achievements"
      ),
      [1, 1]
    );
  });
});