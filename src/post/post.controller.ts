import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateComment } from './dto/create-comment.dto';

@UseGuards(AuthGuard)
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  createPost(@Body() body: CreatePostDto, @Req() req) {
    console.log(req.user.sub);
    return this.postService.createPost(body, req.user.sub);
  }

  @Post(':id/like')

  toggleLike(@Param('id', new ParseUUIDPipe()) postId: string, @Req() req) {
    console.log(req.user.sub);
    return this.postService.toggleLike(postId, req.user.sub);
  }

  @Get(':id')
  getPost(@Param('id', new ParseUUIDPipe()) postId: string, @Req() req) {
    return this.postService.getPost(postId, req.user.sub);
  }

  @Post(':id/comment')
  createComment(@Param('id', new ParseUUIDPipe()) postId: string, @Body() body: CreateComment, @Req() req) {
    return this.postService.createComment(postId, body.content, req.user.sub);
  }

}
