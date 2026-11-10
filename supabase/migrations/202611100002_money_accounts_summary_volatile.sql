-- retail_money_accounts_summary (202611040006) es STABLE, así que PostgREST la ejecuta en una transacción de solo
-- lectura; pero require_permission bloquea la membresía con FOR SHARE y la consulta fallaba siempre con «cannot
-- execute SELECT FOR SHARE in a read-only transaction»: las cuentas de banco y billetera no aparecían en Plata.
-- Solo cambia la volatilidad; el cálculo y los permisos quedan iguales.
begin;
alter function public.retail_money_accounts_summary(uuid) volatile;
notify pgrst,'reload schema';
commit;
