import type { FastifyReply } from 'fastify';
import { ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  Get,
  Req,
  Res,
  Query,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UsePipes,
  UseGuards,
  Controller,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';

import { Url } from '@domain/entities/url.entity';
import { IdentityTcpClient } from '@infra/clients/identity/identity-tcp.client';
import { ListUrlsUseCase } from '@application/use-cases/list-urls.usecase';
import { CreateShortUrlDTO } from '@presentation/dto/create-short-url.dto';
import { IdentityJwtTcpGuard } from '@infra/guards/identity-jwt-tcp.guard';
import { CreateShortUrlUseCase } from '@application/use-cases/create-short-url.usecase';
import { GetShortUrlUseCase } from '@application/use-cases/get-short-url.usecase';
import { GetShortUrlStatsUseCase } from '@application/use-cases/get-short-url-stats.usecase';
import { RedirectShortUrlUseCase } from '@application/use-cases/redirect-short-url.usecase';
import { UpdateShortUrlOriginDTO } from '@presentation/dto/update-short-url-origin.dto';
import { renderHighRiskWarningPage } from '@presentation/views/high-risk-warning-page';
import { SoftDeleteShortUrlUseCase } from '@application/use-cases/soft-delete-short-url.usecase';
import { ShortUrlCodeValidationPipe } from '@infra/pipes/short-url-code-validation.pipe';
import { UpdateShortUrlOriginUseCase } from '@application/use-cases/update-short-url-origin.usecase';
import { IdentityOptionalJwtTcpGuard } from '@infra/guards/identity-optional-jwt-tcp.guard';
import { AuthenticatedRequest, OptionalUserRequest } from '@infra/http/request-with-user.type';

@Controller()
export class UrlController {
  constructor(
    private readonly listUseCase: ListUrlsUseCase,
    private readonly identityClient: IdentityTcpClient,
    private readonly redirectUrlUseCase: RedirectShortUrlUseCase,
    private readonly createShortUrlUseCase: CreateShortUrlUseCase,
    private readonly getShortUrlUseCase: GetShortUrlUseCase,
    private readonly getShortUrlStatsUseCase: GetShortUrlStatsUseCase,
    private readonly softDeleteShortUrlUseCase: SoftDeleteShortUrlUseCase,
    private readonly updateShortUrlOriginUseCase: UpdateShortUrlOriginUseCase,
  ) {}

  @Get('short-urls')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lists URLs shortened by the user.' })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of shortened URLs.',
  })
  @UseGuards(IdentityJwtTcpGuard)
  public async listOwn(@Req() req: AuthenticatedRequest) {
    const result = await this.listUseCase.execute(req.user.id);

    return result.map((item) => this.buildOwnedUrlResponse(item, req.user.username));
  }

  @Get('short-urls/:shortUrlCode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns one shortened URL; anonymous links can be queried without authentication.' })
  @ApiResponse({
    status: 200,
    description: 'Returns the shortened URL payload.',
  })
  @UseGuards(IdentityOptionalJwtTcpGuard)
  public async getOne(
    @Req() req: OptionalUserRequest,
    @Param('shortUrlCode', ShortUrlCodeValidationPipe) shortUrlCode: string,
  ) {
    const shortUrl = await this.getShortUrlUseCase.execute(shortUrlCode, req.user?.id);

    return this.buildOwnedUrlResponse(shortUrl, req.user?.username);
  }

  @Post('short-urls')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Shortens a URL; associates it with the user if one exists.',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns the shortened URL.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseGuards(IdentityOptionalJwtTcpGuard)
  public async shorten(@Req() req: OptionalUserRequest, @Body() { origin }: CreateShortUrlDTO) {
    return await this.createShortUrlUseCase.execute(origin, req.user?.id);
  }

  @Get('short-urls/:shortUrlCode/stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Returns operational stats for one shortened URL; anonymous links can be queried without authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the URL stats payload.',
  })
  @UseGuards(IdentityOptionalJwtTcpGuard)
  public async stats(
    @Req() req: OptionalUserRequest,
    @Param('shortUrlCode', ShortUrlCodeValidationPipe) shortUrlCode: string,
  ) {
    const shortUrl = await this.getShortUrlStatsUseCase.execute(shortUrlCode, req.user?.id);

    return this.buildStatsResponse(shortUrl, req.user?.username);
  }

  @Patch('short-urls/:shortUrlCode')
  @ApiBody({ type: UpdateShortUrlOriginDTO })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Updates the origin URL of a shortened URL.' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated shortened URL.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseGuards(IdentityJwtTcpGuard)
  public async updateOrigin(
    @Req() req: AuthenticatedRequest,
    @Body() updateShortUrlOriginDTO: UpdateShortUrlOriginDTO,
    @Param('shortUrlCode', ShortUrlCodeValidationPipe) shortUrlCode: string,
  ) {
    const updatedShortUrl = await this.updateShortUrlOriginUseCase.execute(
      req.user.id,
      shortUrlCode,
      updateShortUrlOriginDTO,
    );

    return updatedShortUrl;
  }

  @Delete('short-urls/:shortUrlCode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletes a shortened URL.' })
  @ApiResponse({
    status: 200,
    description: 'The shortened URL has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Shortened URL not found or already deleted.',
  })
  @UseGuards(IdentityJwtTcpGuard)
  public async softDelete(
    @Req() req: AuthenticatedRequest,
    @Param('shortUrlCode', ShortUrlCodeValidationPipe) shortUrlCode: string,
  ) {
    await this.softDeleteShortUrlUseCase.execute(req.user.id, shortUrlCode);

    return { message: 'Shortened URL successfully deleted.' };
  }

  @Get(':username/:alternativeSlug')
  public async redirectHumanized(
    @Res() res: FastifyReply,
    @Param('username') username: string,
    @Param('alternativeSlug') alternativeSlug: string,
    @Query('proceed') proceed?: string,
  ) {
    const identityResult = await this.identityClient.findUserByUsername(username);

    if (!identityResult.isSuccess || !identityResult.value) {
      throw new NotFoundException('Shortened URL not found or inactive!');
    }

    const shortUrl = await this.redirectUrlUseCase.executeHumanized(identityResult.value.userId, alternativeSlug);

    if (this.shouldDisplayHighRiskWarning(shortUrl, proceed)) {
      return res
        .status(200)
        .type('text/html; charset=utf-8')
        .send(
          renderHighRiskWarningPage(
            shortUrl,
            `/${encodeURIComponent(username)}/${encodeURIComponent(alternativeSlug)}?proceed=1`,
          ),
        );
    }

    await this.redirectUrlUseCase.trackVisit(shortUrl.id);

    return res.status(302).redirect(shortUrl.origin);
  }

  @Get(':shortUrlCode')
  public async redirect(
    @Res() res: FastifyReply,
    @Param('shortUrlCode', ShortUrlCodeValidationPipe) shortUrlCode: string,
    @Query('proceed') proceed?: string,
  ) {
    const shortUrl = await this.redirectUrlUseCase.execute(shortUrlCode);

    if (this.shouldDisplayHighRiskWarning(shortUrl, proceed)) {
      return res
        .status(200)
        .type('text/html; charset=utf-8')
        .send(renderHighRiskWarningPage(shortUrl, `/${encodeURIComponent(shortUrlCode)}?proceed=1`));
    }

    await this.redirectUrlUseCase.trackVisit(shortUrl.id);

    return res.status(302).redirect(shortUrl.origin);
  }

  private buildOwnedUrlResponse(shortUrl: Url, username?: string | null) {
    const publicPaths = this.buildPublicPaths(shortUrl, username);

    return {
      id: shortUrl.id,
      origin: shortUrl.origin,
      clicks: shortUrl.clicks,
      userId: shortUrl.userId ?? null,
      code: shortUrl.code,
      createdAt: shortUrl.createdAt,
      updatedAt: shortUrl.updatedAt,
      deletedAt: shortUrl.deletedAt ?? null,
      publicPaths,
      enrichment: shortUrl.enrichment
        ? {
            status: shortUrl.enrichment.status,
            attempts: shortUrl.enrichment.attempts,
            enrichedAt: shortUrl.enrichment.enrichedAt ?? null,
            riskLevel: shortUrl.enrichment.riskLevel ?? null,
            category: shortUrl.enrichment.category ?? null,
            summary: shortUrl.enrichment.summary ?? null,
            tags: shortUrl.enrichment.tags,
            alternativeSlug: shortUrl.enrichment.alternativeSlug ?? null,
            provider: shortUrl.enrichment.provider ?? null,
            hasHumanizedPath: Boolean(publicPaths.humanized),
            error: shortUrl.enrichment.error ?? null,
          }
        : null,
    };
  }

  private buildStatsResponse(shortUrl: Url, username?: string | null) {
    const now = Date.now();
    const ageMs = Math.max(now - shortUrl.createdAt.getTime(), 0);
    const ageInDays = this.roundMetric(ageMs / 86_400_000);
    const activeDays = Math.max(ageMs / 86_400_000, 1);
    const baseResponse = this.buildOwnedUrlResponse(shortUrl, username);

    return {
      ...baseResponse,
      visitMetrics: {
        totalClicks: shortUrl.clicks,
        averageClicksPerDay: this.roundMetric(shortUrl.clicks / activeDays),
      },
      lifecycle: {
        createdAt: shortUrl.createdAt,
        updatedAt: shortUrl.updatedAt,
        deletedAt: shortUrl.deletedAt ?? null,
        ageInDays,
        isActive: !shortUrl.deletedAt,
      },
    };
  }

  private buildPublicPaths(shortUrl: Url, username?: string | null) {
    return {
      shortened: `/${encodeURIComponent(shortUrl.code)}`,
      humanized:
        shortUrl.userId && shortUrl.enrichment?.alternativeSlug && username
          ? `/${encodeURIComponent(username)}/${encodeURIComponent(shortUrl.enrichment.alternativeSlug)}`
          : null,
    };
  }

  private shouldDisplayHighRiskWarning(shortUrl: Url, proceed?: string) {
    if (['1', 'true', 'yes'].includes((proceed ?? '').toLowerCase())) {
      return false;
    }

    return shortUrl.enrichment?.status === 'completed' && shortUrl.enrichment.riskLevel?.toLowerCase() === 'high';
  }

  private roundMetric(value: number) {
    return Number(value.toFixed(2));
  }
}
