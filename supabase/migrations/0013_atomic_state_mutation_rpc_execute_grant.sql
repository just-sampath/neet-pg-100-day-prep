do $$
begin
  if to_regprocedure('public.apply_user_state_mutation_atomic(uuid, bigint, bigint, jsonb, jsonb)') is not null then
    grant execute on function public.apply_user_state_mutation_atomic(uuid, bigint, bigint, jsonb, jsonb)
      to authenticated, service_role;
  end if;
end
$$;
