import { z } from "zod";

export const SoundDataSchema = z.object({
	src: z.array(z.string()),
	sprite: z.record(
		z.string(),
		z.union([
			z.tuple([z.number(), z.number()]),
			z.tuple([z.number(), z.number(), z.boolean()]),
		]),
	),
});

export type SoundData = z.infer<typeof SoundDataSchema>;
