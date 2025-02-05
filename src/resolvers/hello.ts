import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
	@Query((_return) => String)
	hello(): string {
		return "hello world";
	}
}
