export class MetaDto {
  total: number;
  page: number;
  lastPage: number;
}

export class UserSimpleDto {
  id: string;
  username: string;
}

export class CommunitySimpleDto {
  id: string;
  name: string;
}

export class PostResponseDto {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  communityId: string;
  userId: string;

  user: UserSimpleDto;
  community: CommunitySimpleDto;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
}

export class PaginatedPostsResponseDto {
  data: PostResponseDto[];
  meta: MetaDto;
}
