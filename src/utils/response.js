export const success = (res, data = null, message = "OK", statusCode = 200) =>
  res.status(statusCode).json({ ok: true, message, data });

export const created = (
  res,
  data = null,
  message = "Recurso creado exitosamente",
) => success(res, data, message, 201);

export const paginated = (res, { data, total, page, limit }) =>
  res.status(200).json({
    ok: true,
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });

export const error = (
  res,
  message = "Error interno del servidor",
  statusCode = 500,
  errors = null,
) => {
  const body = { ok: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};
