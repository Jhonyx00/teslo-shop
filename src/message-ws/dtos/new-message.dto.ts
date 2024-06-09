import { IsString, MinLength } from 'class-validator';

export class newMessageDto {
  @IsString()
  @MinLength(1)
  message: string;
}
