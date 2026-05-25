import { PartialType } from "@nestjs/swagger";
import { CreateCommunityPostDto } from "./create-community.dto";

export class UpdateCommunityDto extends PartialType(CreateCommunityPostDto) {}
