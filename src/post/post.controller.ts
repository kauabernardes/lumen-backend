import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(AuthGuard)
  createPost(@Body() body: CreatePostDto, @Req() req) {
    return this.postService.createPost(body, req.user.id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  toggleLike(@Param('id') postId: string, @Req() req) {
    return this.postService.toggleLike(postId, req.user.id);
  }
}