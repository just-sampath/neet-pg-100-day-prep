do $$
begin
	if to_regprocedure('public._apply_single_key_table_delta(regclass, uuid, text, jsonb, jsonb)') is not null then
		revoke all on function public._apply_single_key_table_delta(regclass, uuid, text, jsonb, jsonb) from public;
	end if;

	if to_regprocedure('public._apply_schedule_block_delta(uuid, jsonb, jsonb)') is not null then
		revoke all on function public._apply_schedule_block_delta(uuid, jsonb, jsonb) from public;
	end if;

	if to_regprocedure('public.apply_user_state_mutation_atomic(uuid, bigint, bigint, jsonb, jsonb)') is not null then
		revoke all on function public.apply_user_state_mutation_atomic(uuid, bigint, bigint, jsonb, jsonb) from public;
	end if;
end
$$;
