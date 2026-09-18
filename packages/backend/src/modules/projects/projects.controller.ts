import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from './dto';
import type { UserPayload } from '../../common';
import {
  JwtAuthGuard,
  CurrentUser,
  ResponseMessage,
  ApiErrorResponseDto,
} from '../../common';

/**
 * Controller handling project CRUD operations.
 * All endpoints require authentication.
 */
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Creates a new project for the authenticated user.
   */
  @Post()
  @ResponseMessage('Project created successfully')
  @ApiOperation({
    summary: 'Create project',
    description: 'Create a new design project with title and optional description',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  async create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(user.id, dto);
  }

  /**
   * Lists all projects for the authenticated user.
   */
  @Get()
  @ApiOperation({
    summary: 'List projects',
    description: 'Get all projects owned by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of projects',
    type: [ProjectResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  async findAll(@CurrentUser() user: UserPayload): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAllByUser(user.id);
  }

  /**
   * Gets a specific project by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get project',
    description: 'Get a specific project by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project details',
    type: ProjectResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, user.id);
  }

  /**
   * Updates a project by ID.
   */
  @Patch(':id')
  @ResponseMessage('Project updated successfully')
  @ApiOperation({
    summary: 'Update project',
    description: 'Update project title and/or description',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, user.id, dto);
  }

  /**
   * Deletes a project by ID.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project',
    description: 'Delete a project and all its messages',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Project deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.projectsService.remove(id, user.id);
  }
}
